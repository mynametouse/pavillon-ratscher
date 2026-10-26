# feat/piper (Falko, 25.10.2026): natural voices for free – the engine 'piper' of audio/stimme.js. The engine registers; the voices load from
# Hugging Face (or, without internet, from a stand-in model served in its place: fake=1, chosen by itself when huggingface.co is out of
# reach) into the Cache Storage; a German sentence for Hubert and one for Katrin (different voices: model or speaker, pitch); one played
# through the voices' bus (not the browser's speech); timings (first audio, real-time factor), memory; a reload takes the voices from the
# cache (no second download); without the network (Hugging Face routed to an error) the browser's voice speaks, with a note. WAVs → out/piper/.
# survey=1 (GitHub Actions): every German Piper voice and speaker once, with pitch, brightness, noise and periodicity, WAVs to listen to.
#   python3 viz3/test/piper.py PORT [fake=1,survey=1,nogeo=0]
import sys, os, time, json, base64, subprocess, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
# on GitHub Actions the runner's log shows only run.py's verdict, and the artifact cannot be fetched from the chat machine: this test's
# lines go to the job log as well (the parent's stdout), so the numbers can be read there (get_job_logs)
class _Tee:
    def __init__(self, a, b): self.a, self.b = a, b
    def write(self, t):
        self.a.write(t)
        try: self.b.write(t); self.b.flush()
        except Exception: pass
    def flush(self): self.a.flush()
if os.environ.get('GITHUB_ACTIONS'):
    try:
        _job = open(f'/proc/{os.getppid()}/fd/1', 'w')
        sys.stdout, sys.stderr = _Tee(sys.stdout, _job), _Tee(sys.stderr, _job)
    except Exception as e:
        print('job log not reachable:', e)
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else ''
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
QUERY = '?bauphase=0' + ('&nogeo=1' if opts.get('nogeo', '1') == '1' else '')
OUT = lib.out('piper')
ck = lib.Checks('piper')
errs = []
HF = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/'
EXTRA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'extra', 'piper')

def online():
    try:
        urllib.request.urlopen(urllib.request.Request(HF + 'de/de_DE/eva_k/x_low/de_DE-eva_k-x_low.onnx.json', method='HEAD'), timeout=10)
        return True
    except Exception as e:
        print('Hugging Face not reachable:', str(e)[:120], flush=True)
        return False
FAKE = opts.get('fake') == '1' or (opts.get('fake') != '0' and not online())
print('mode:', 'stand-in model (fake)' if FAKE else 'real voices from Hugging Face', flush=True)
MODE = {'offline': False}
HFREQ = []      # model files asked for (url, bytes)

def rss():
    r = 0
    for ln in subprocess.run(['ps', '-eo', 'rss,args'], capture_output=True, text=True).stdout.split('\n'):
        if ('headless_shell' in ln or 'chrom' in ln) and '--type=renderer' in ln: r += int(ln.split()[0]) // 1024
    return r

def hf_route(route):
    url = route.request.url
    if MODE['offline']:
        HFREQ.append((url, 0, 'aborted'))
        return route.abort('internetdisconnected')
    if FAKE:
        f = 'fake.onnx.json' if url.endswith('.json') else 'fake.onnx'
        body = open(os.path.join(EXTRA, f), 'rb').read()
        HFREQ.append((url, len(body), 'fake'))
        return route.fulfill(status=200, body=body, headers={'content-type': 'application/json' if f.endswith('json') else 'application/octet-stream',
                                                             'access-control-allow-origin': '*', 'content-length': str(len(body))})
    HFREQ.append((url, 0, 'net'))
    return route.continue_()

def worker_route(route):
    # the test server sends a strict content policy (connect-src 'self', like an artifact host); a worker keeps the policy of its own
    # script, so the worker gets its script without it – the website (GitHub Pages) has none
    r = route.fetch()
    h = {k: v for k, v in r.headers.items() if k.lower() != 'content-security-policy'}
    route.fulfill(response=r, headers=h)

# in the page: a WAV of the samples, and what they sound like (pitch, brightness, noise floor, periodicity)
HELP = r"""
window.__wav = (pcm, sr) => { const n = pcm.length, b = new DataView(new ArrayBuffer(44 + n * 2)); const w = (o, s) => [...s].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, sr, true); b.setUint32(28, sr * 2, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, 'data'); b.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) b.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 32767, true);
  let s = ''; const u = new Uint8Array(b.buffer); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
window.__ana = (pcm, sr) => { const fl = Math.round(sr * 0.04), hop = Math.round(sr * 0.01), f0 = [], per = [], rms = [], cen = [];
  const N = 1024, re = new Float64Array(N), im = new Float64Array(N);
  const fft = () => { for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= N; len <<= 1) { const a = -2 * Math.PI / len; for (let i = 0; i < N; i += len) for (let k = 0; k < len / 2; k++) { const c = Math.cos(a * k), s = Math.sin(a * k);
      const xr = re[i + k + len / 2] * c - im[i + k + len / 2] * s, xi = re[i + k + len / 2] * s + im[i + k + len / 2] * c; re[i + k + len / 2] = re[i + k] - xr; im[i + k + len / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi; } } };
  for (let s = 0; s + fl < pcm.length; s += hop) { let e = 0; for (let i = 0; i < fl; i++) e += pcm[s + i] * pcm[s + i]; const r = Math.sqrt(e / fl); rms.push(r); if (r < 0.01) continue;
    let best = 0, lag = 0; const lo = Math.floor(sr / 400), hi = Math.floor(sr / 60);
    for (let L = lo; L <= hi; L++) { let c = 0, e1 = 0, e2 = 0; for (let i = 0; i + L < fl; i++) { c += pcm[s + i] * pcm[s + i + L]; e1 += pcm[s + i] ** 2; e2 += pcm[s + i + L] ** 2; } const v = c / Math.sqrt(e1 * e2 + 1e-12); if (v > best) { best = v; lag = L; } }
    per.push(best); if (best > 0.6) f0.push(sr / lag);
    if (s % (hop * 4) === 0) { re.fill(0); im.fill(0); for (let i = 0; i < Math.min(N, fl); i++) re[i] = pcm[s + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / Math.min(N, fl))); fft();
      let a = 0, w = 0; for (let k = 1; k < N / 2; k++) { const m = Math.hypot(re[k], im[k]); a += m * k * sr / N; w += m; } if (w > 0) cen.push(a / w); } }
  const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : 0; }, q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(p * (b.length - 1))] : 0; };
  const db = x => 20 * Math.log10(Math.max(1e-6, x));
  return { sec: +(pcm.length / sr).toFixed(2), f0: Math.round(med(f0)), f0lo: Math.round(q(f0, 0.1)), f0hi: Math.round(q(f0, 0.9)), voiced: +(f0.length / Math.max(1, rms.length)).toFixed(2),
    per: +med(per).toFixed(2), cen: Math.round(med(cen)), floor: Math.round(db(q(rms, 0.1)) - db(q(rms, 0.9))), peak: +Math.max(...pcm.map(Math.abs)).toFixed(2) }; };
window.__say = async (who, text, save) => { const t0 = performance.now(); const r = await PIPER.synth(who, text); const ms = Math.round(performance.now() - t0);
  if (!r || r.cancelled) return { cancelled: true }; const v = typeof who === 'string' ? PIPER.voiceFor(who) : who; const sr = Math.round(r.sr * (v.pitch || 1));
  return Object.assign({ ms, sr: r.sr, t: r.t, a: __ana(r.pcm, sr) }, save ? { wav: __wav(r.pcm, sr) } : {}); };
"""

def E(js): return pg.evaluate(js)
def J(js): return json.loads(pg.evaluate('JSON.stringify(' + js + ')'))
def say(who, text, name=None):
    w = json.dumps(who)
    r = pg.evaluate(f"__say({w}, {json.dumps(text)}, {json.dumps(bool(name))})")
    if name and r.get('wav'):
        open(os.path.join(OUT, name + '.wav'), 'wb').write(base64.b64decode(r.pop('wav')))
    return r

def start(b):
    ctx = b.new_context(viewport={'width': 1000, 'height': 640}, bypass_csp=True)
    p = ctx.new_page()
    lib.preset(p)
    p.add_init_script("try { localStorage.setItem('pav-sound', '1'); } catch (e) {}")
    p.add_init_script(HELP)
    p.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    p.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    ctx.route('https://huggingface.co/**', hf_route)
    ctx.route('**/lazy/piper.js', worker_route)
    return ctx, p

T_HUB = 'Nu. Dein Rasen steht kniehoch, mäh den mal, bevor die Samen zu mir rüberfliegen.'
T_KAT = 'Grüß dich! Ich komme gerade aus der Spätschicht, aber für einen Kaffee ist immer Zeit.'
T2 = 'Und den Diesel stellst du bitte in die Garage, nicht in die Sonne.'

with lib.browser() as b:
    ctx, pg = start(b)
    lib.boot(pg, port, QUERY)
    # ---- the engine is there ----
    ck('PIPER module loaded', E("!!(window.PIPER && window.STIMME)"))
    E("window.__pp = document.createElement('div'); document.body.appendChild(__pp); STIMME.panel(__pp)")
    ck('engine „Natürlich“ in the settings', E("(__pp.querySelector('[data-st=\"engine:piper\"]') || {}).textContent === 'Natürlich'"))
    ck('nothing loaded before it is chosen', E("!PIPER.state().worker && !PIPER.state().loading") and not HFREQ, str(HFREQ[:2]))
    E("__pp.querySelector('[data-st=\"engine:piper\"]').click()")
    ck('chosen: STIMME.chosen', E("STIMME.chosen === 'piper'"))
    # ---- one voice per person ----
    V = J("Object.fromEntries(['hubert', 'ronald', 'gerhard', 'manfred', 'wolfgang', 'uwe', 'jens', 'katrin', 'ingrid', 'heike'].map(k => [k, PIPER.voiceFor(k)]))")
    print('voices', json.dumps({k: [v['id'], v['ls'], v['pitch']] for k, v in V.items()}), flush=True)
    sig = {k: (v['id'], round(v['ls'], 3), round(v['pitch'], 3)) for k, v in V.items()}
    ck('every person sounds different (voice, pace, pitch)', len(set(sig.values())) == len(sig))
    ck('Hubert and Katrin: different voices', V['hubert']['id'] != V['katrin']['id'])
    ck('Hubert and Ronald: different voices', V['hubert']['id'] != V['ronald']['id'])
    G = J("Object.fromEntries(Object.entries(PIPER.MODELS).map(([k, m]) => [k, m.g]))")
    ck('women get a woman’s voice, men a man’s', all(G[V[k]['m']] in ('f', '?') for k in ('katrin', 'ingrid', 'heike')) and all(G[V[k]['m']] in ('m', '?') for k in ('hubert', 'ronald', 'jens')))
    ck('older people slower and lower', V['hubert']['ls'] > V['jens']['ls'] and V['hubert']['pitch'] < V['jens']['pitch'] and V['ingrid']['pitch'] < V['katrin']['pitch'])
    E("STIMME.person('spazier_f', { name: 'Gisela', g: 'f', age: 71 }); STIMME.person('fahrer_m', { name: 'Kai', g: 'm', age: 28 })")
    L = J("{ f: PIPER.voiceFor('spazier_f'), m: PIPER.voiceFor('fahrer_m') }")
    ck('a person registered later: a voice by gender and age', G[L['f']['m']] in ('f', '?') and G[L['m']['m']] in ('m', '?') and L['f']['ls'] > 1 and L['m']['ls'] < 1, json.dumps(L))
    need = J("PIPER.needed()")
    mb = E("PIPER.needed().reduce((s, m) => s + PIPER.MODELS[m].mb, 0)")
    print('models needed', need, mb, 'MB', flush=True)
    # ---- load: download, cache ----
    t0 = time.time()
    try:
        E("PIPER.load()")
        loaded = True
    except Exception as e:
        loaded = False; print('load failed', str(e)[:300], flush=True)
    dl = round(time.time() - t0, 1)
    ck('voices loaded', loaded and E("PIPER.needed().every(m => PIPER.state().cached.includes(m))"), f"{dl} s for {mb} MB")
    ck('in the Cache Storage', E("caches.open('pav-piper-v1').then(c => c.keys()).then(k => k.length)") >= 2 * len(need))
    print('downloads', len([u for u in HFREQ if u[0].endswith('.onnx')]), 'models', flush=True)
    # ---- Hubert and Katrin ----
    E("PIPER.end()")
    r0 = rss()
    h1 = say('hubert', T_HUB, 'hubert_1')
    print('hubert first (worker, session, sentence)', json.dumps(h1), flush=True)
    h2 = say('hubert', T2, 'hubert_2')
    print('hubert second', json.dumps(h2), flush=True)
    k1 = say('katrin', T_KAT, 'katrin_1')
    print('katrin first', json.dumps(k1), flush=True)
    k2 = say('katrin', T2, 'katrin_2')
    ck('Hubert speaks', h1.get('a', {}).get('sec', 0) > 1.5, json.dumps(h1.get('a')))
    ck('Katrin speaks', k1.get('a', {}).get('sec', 0) > 1.5, json.dumps(k1.get('a')))
    if not FAKE:
        ck('Hubert lower than Katrin (median pitch)', 0 < h1['a']['f0'] < k1['a']['f0'] * 0.8, f"{h1['a']['f0']} Hz / {k1['a']['f0']} Hz")
    else:
        ck('Hubert and Katrin differ (stand-in: the pitch factor)', h1['a']['f0'] != k1['a']['f0'], f"{h1['a']['f0']} / {k1['a']['f0']}")
    rtf = [s for s in (h2.get('t', {}), k2.get('t', {})) if s.get('infer')]
    ms2 = h2.get('ms', 0)
    print(f"TIMING first audio, session warm: {ms2} ms for {h2.get('a', {}).get('sec')} s speech (phonemes {h2.get('t', {}).get('phon')} ms, inference {h2.get('t', {}).get('infer')} ms)", flush=True)
    print(f"TIMING model into memory (session): Hubert {h1.get('t', {}).get('load')} ms, Katrin {k1.get('t', {}).get('load')} ms; first sentence incl. worker start {h1.get('ms')} ms", flush=True)
    st = J("PIPER.stats()")
    rt = [s['rtf'] for s in st if s.get('rtf')]
    print('TIMING real-time factor (inference / speech):', rt, flush=True)
    stat = pg.evaluate("PIPER.stat()")
    r1 = rss()
    print(f"MEMORY WebAssembly heap in the worker {stat.get('mem')} MB, sessions {stat.get('sessions')}, renderer RSS {r0} → {r1} MB", flush=True)
    ck('at most the allowed number of models in memory', len(stat.get('sessions', [])) <= E("PIPER.state().keep"), str(stat))
    if not FAKE:
        ck('a sentence ready within 3 s once the voice is in memory (CI runner)', 0 < ms2 < 3000, f'{ms2} ms')
    # ---- through the voices' bus, not the browser's speech ----
    pg.mouse.click(500, 320)
    E("window.__spk = 0; const o = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { __spk++; return o(u); }; 0")
    res = pg.evaluate("""async () => { const h = STIMME.prepare('hubert', 'Na, auch mal wieder da?', { at: [NPC.NPCS.hubert.x, NPC.NPCS.hubert.y] });
      const b = await h.data; const played = await STIMME.play(h); return { buf: !!b && b instanceof AudioBuffer, sec: b ? b.duration : 0, sr: b ? b.sampleRate : 0, played, err: h.err ? String(h.err) : '', spk: __spk }; }""")
    ck('played through the voices’ bus (an AudioBuffer, not the browser’s speech)', res['buf'] and res['played'] is True and res['spk'] == 0, json.dumps(res))
    ck('pitch as playback rate (sample rate of the buffer)', res['sr'] and abs(res['sr'] - h1['sr'] * V['hubert']['pitch']) < 2, f"{res['sr']} vs {h1['sr']} × {V['hubert']['pitch']}")
    # ---- the settings: the engine's part, a voice per person ----
    E("STIMME.panel(__pp)")
    ck('settings: state of the voices', 'geladen' in E("(document.getElementById('piper-state') || {}).textContent || ''"), E("(document.getElementById('piper-state') || {}).textContent || ''"))
    ck('settings: a choice per person', E("__pp.querySelectorAll('select[data-st-eng=voice]').length") >= 10)
    E("const s = __pp.querySelector('select[data-st-eng=voice][data-k=heike]'); s.value = 'thorsten_emotional:neutral'; s.dispatchEvent(new Event('change', { bubbles: true }))")
    ck('settings: chosen by hand, saved', E("PIPER.voiceFor('heike').id === 'thorsten_emotional:neutral' && JSON.parse(localStorage.getItem('pav-piper-v1')).over.heike === 'thorsten_emotional:neutral'"))
    E("const s = __pp.querySelector('select[data-st-eng=voice][data-k=heike]'); s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true }))")
    ck('settings: back to automatic', E("PIPER.voiceFor('heike').auto === true"))
    lib.shot(pg, OUT, 'page')
    pg.close()
    # ---- a reload: the voices come from the cache ----
    pg = ctx.new_page()
    lib.preset(pg)
    pg.add_init_script(HELP)
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    lib.boot(pg, port, QUERY)
    n0 = len([u for u in HFREQ if u[0].endswith('.onnx')])
    ck('after a reload: the voices are known as loaded', E("new Promise(r => setTimeout(r, 500)).then(() => PIPER.needed().every(m => PIPER.state().cached.includes(m)))"))
    c1 = say('hubert', T2, 'hubert_reload')
    n1 = len([u for u in HFREQ if u[0].endswith('.onnx')])
    ck('after a reload: no second download', n1 == n0 and c1.get('t', {}).get('fresh') is False, f"{n1 - n0} model requests, {json.dumps(c1.get('t'))}")
    print(f"TIMING first audio after a reload (cached model: worker, session, sentence): {c1.get('ms')} ms for {c1.get('a', {}).get('sec')} s speech", flush=True)
    # ---- without the network: the browser's voice, with a note ----
    MODE['offline'] = True
    E("window.__notes = []; STIMME.onError = t => __notes.push(t); window.__spk = 0; const o = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { __spk++; return o(u); }; 0")
    pg.evaluate("PIPER.clear()")
    ck('cache cleared', E("PIPER.state().cached.length === 0"))
    E("STIMME.engineName = 'piper'; window.__h = STIMME.prepare('katrin', 'Hallo, ist da jemand?'); STIMME.play(__h)")
    t0 = time.time()
    while time.time() - t0 < 20 and not E("__notes.length > 0 && __spk > 0"):
        time.sleep(0.3)
    notes = J("__notes")
    ck('offline: the browser’s voice speaks', E("__spk") > 0, str(E("__spk")))
    ck('offline: a note', any('Natürlich' in n for n in notes), str(notes))
    ck('offline: until it works again the device’s voice', E("STIMME.engineName === 'browser' && STIMME.chosen === 'piper'"))
    E("STIMME.panel(__pp = document.body.appendChild(document.createElement('div')))")
    ck('offline: said in the settings', 'nicht geladen werden' in E("(document.getElementById('piper-state') || {}).textContent || ''"))
    MODE['offline'] = False
    # ---- survey (GitHub Actions): every German voice once ----
    if opts.get('survey') == '1' and not FAKE:
        # the model cards: dataset and licence of each voice
        for p in ['thorsten/medium', 'thorsten_emotional/medium', 'kerstin/low', 'ramona/low', 'eva_k/x_low', 'karlsson/low', 'pavoque/low', 'mls/medium']:
            try:
                card = urllib.request.urlopen(HF + 'de/de_DE/' + p + '/MODEL_CARD', timeout=20).read().decode('utf8', 'replace')
                print('MODEL_CARD', p, '|', ' '.join(card.split())[:400], flush=True)
            except Exception as e:
                print('MODEL_CARD', p, 'not read', str(e)[:80], flush=True)
            try:
                n = p.split('/')[0]; cf = json.loads(urllib.request.urlopen(HF + f"de/de_DE/{p}/de_DE-{n}-{p.split('/')[1]}.onnx.json", timeout=20).read())
                mp = cf.get('phoneme_id_map', {})
                print('MODEL_CONF', p, '| symbols', cf.get('num_symbols'), '| ids', len(mp), '| ç', mp.get('ç'), '| cedilla', mp.get('\u0327'), '| inference', cf.get('inference'), '| sr', cf.get('audio', {}).get('sample_rate'), '| piper', cf.get('piper_version'), flush=True)
            except Exception as e:
                print('MODEL_CONF', p, 'not read', str(e)[:80], flush=True)
        try:
            spk = json.loads(urllib.request.urlopen(HF + 'de/de_DE/mls/medium/de_DE-mls-medium.onnx.json', timeout=20).read())['speaker_id_map']
            print('MLS speakers', json.dumps(spk), flush=True)
        except Exception as e:
            print('MLS speakers not read', str(e)[:80], flush=True)
        E("PIPER.configure({ keep: 1 })")
        S = 'Hallo, ich bin aus dem Dorf. Heute Abend gehen wir zum Feuer am Acker, kommst du mit?'
        rows = []
        voices = [('thorsten', 0), ('thorsten_high', 0), ('thorsten_low', 0), ('karlsson', 0), ('pavoque', 0), ('kerstin', 0), ('ramona', 0), ('eva_k', 0)]
        voices += [('thorsten_emotional', i) for i in range(8)]
        voices += [('mls', i) for i in range(int(opts.get('mls', '236')))]
        for m, sid in voices:
            try:
                r = say({'v': f'{m}:{sid}' if m in ('mls',) else m if m != 'thorsten_emotional' else f"{m}:{['amused', 'angry', 'disgusted', 'drunk', 'neutral', 'sleepy', 'surprised', 'whisper'][sid]}", 'ls': 1, 'pitch': 1}, S,
                        f'survey_{m}_{sid}' if m != 'mls' or sid % 1 == 0 else None)
                a = r.get('a', {})
                rows.append(dict(m=m, sid=sid, **a, infer=r.get('t', {}).get('infer'), load=r.get('t', {}).get('load'), mem=r.get('t', {}).get('mem')))
                print('SURVEY', json.dumps(rows[-1]), flush=True)
            except Exception as e:
                print('SURVEY FAIL', m, sid, str(e)[:200], flush=True)
            if m != 'mls' or sid == 0:
                pg.evaluate("PIPER.drop()")
        json.dump(rows, open(os.path.join(OUT, 'survey.json'), 'w'), indent=1)
        ck('survey: every voice spoke', len(rows) == len(voices), f'{len(rows)}/{len(voices)}')
    ck.errors(errs)
ck.done()
