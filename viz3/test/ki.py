# feat/ki (Falko, 25.10.2026): free conversations with Hubert and Ronald – the KI part of the talk panel, one turn against a stand-in for the
# Claude API (same origin, so the test server's content policy lets it through; requests checked: model, no thinking, cached system prompt,
# tools, the situation before the words, tool results in the next request), the task the neighbour gives (journal, steps by events, reward),
# the summary and gossip after the talk, the two at the table telling it on, the reset, the panel without a key, a refused key.
#   python3 viz3/test/ki.py PORT [nogeo=1]
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
arg = sys.argv[2] if len(sys.argv) > 2 else 'nogeo=1'
opts = dict(a.split('=', 1) if '=' in a else (a, '1') for a in arg.split(',') if a)
QUERY = '?bauphase=0' + ('&nogeo=1' if opts.get('nogeo', '1') == '1' else '')
OUT = lib.out('ki')
ck = lib.Checks('ki')
errs = []
REQ = []        # request bodies the stand-in received
MODE = {'auth': False}

def sse(blocks, stop='end_turn'):
    """A streamed answer: blocks are ('text', str) or ('tool', id, name, input)."""
    ev = [('message_start', {'type': 'message_start', 'message': {'id': 'msg_test', 'type': 'message', 'role': 'assistant', 'model': 'claude-haiku-5-5',
           'content': [], 'stop_reason': None, 'stop_sequence': None, 'usage': {'input_tokens': 900, 'output_tokens': 1, 'cache_read_input_tokens': 2400, 'cache_creation_input_tokens': 0}}})]
    for i, b in enumerate(blocks):
        if b[0] == 'text':
            ev.append(('content_block_start', {'type': 'content_block_start', 'index': i, 'content_block': {'type': 'text', 'text': ''}}))
            for part in [b[1][j:j + 9] for j in range(0, len(b[1]), 9)]:
                ev.append(('content_block_delta', {'type': 'content_block_delta', 'index': i, 'delta': {'type': 'text_delta', 'text': part}}))
        else:
            ev.append(('content_block_start', {'type': 'content_block_start', 'index': i, 'content_block': {'type': 'tool_use', 'id': b[1], 'name': b[2], 'input': {}}}))
            ev.append(('content_block_delta', {'type': 'content_block_delta', 'index': i, 'delta': {'type': 'input_json_delta', 'partial_json': json.dumps(b[3], ensure_ascii=False)}}))
        ev.append(('content_block_stop', {'type': 'content_block_stop', 'index': i}))
    ev.append(('message_delta', {'type': 'message_delta', 'delta': {'stop_reason': stop, 'stop_sequence': None}, 'usage': {'output_tokens': 60}}))
    ev.append(('message_stop', {'type': 'message_stop'}))
    return ''.join(f'event: {n}\ndata: {json.dumps(d, ensure_ascii=False)}\n\n' for n, d in ev)

TASK = {'titel': 'Rasen mähen für Hubert', 'schritte': [{'art': 'tun', 'ziel': 'rasen_maehen', 'text': 'Mäh deinen Rasen, sonst fliegen die Samen zu mir.'}], 'belohnung': 10}

def answer(body):
    """The stand-in's answer to one request body → (status, content type, text)."""
    if MODE['auth']:
        return 401, 'application/json', json.dumps({'type': 'error', 'error': {'type': 'authentication_error', 'message': 'invalid x-api-key'}})
    oc = body.get('output_config') or {}
    if oc.get('format'):   # the summary after the talk
        out = {'zusammenfassung': 'Falko hat Hilfe angeboten; er soll den Rasen mähen.',
               'zeilen': [{'wer': 'h', 'text': 'Der Neue hat Hilfe angeboten.'}, {'wer': 'r', 'text': 'Siehste, hab ich doch gesagt. Der ist in Ordnung.'}],
               'notiz_fuer_anderen': 'Falko hat Hubert Hilfe angeboten.', 'meinung_anderer': 4}
        msg = {'id': 'msg_sum', 'type': 'message', 'role': 'assistant', 'model': 'claude-haiku-5-5', 'content': [{'type': 'text', 'text': json.dumps(out, ensure_ascii=False)}],
               'stop_reason': 'end_turn', 'stop_sequence': None, 'usage': {'input_tokens': 500, 'output_tokens': 80}}
        return 200, 'application/json', json.dumps(msg, ensure_ascii=False)
    if not body.get('stream'):   # the key test in the settings
        msg = {'id': 'msg_t', 'type': 'message', 'role': 'assistant', 'model': 'claude-haiku-5-5', 'content': [{'type': 'text', 'text': 'Nu.'}],
               'stop_reason': 'end_turn', 'stop_sequence': None, 'usage': {'input_tokens': 20, 'output_tokens': 2}}
        return 200, 'application/json', json.dumps(msg)
    last = body['messages'][-1]
    if any(b.get('type') == 'tool_result' for b in last['content']) and not any(b.get('type') == 'text' for b in last['content']):
        return 200, 'text/event-stream', sse([('text', 'Und dann sehen wir weiter.')])
    return 200, 'text/event-stream', sse([
        ('text', 'Hilfe? Na gut, nu. Dein Rasen steht kniehoch. Mäh den mal.'),
        ('tool', 'toolu_1', 'aufgabe_geben', TASK),
        ('tool', 'toolu_2', 'merken', {'notiz': 'Falko hat mir Hilfe angeboten.', 'weitererzaehlen': True}),
        ('tool', 'toolu_3', 'meinung_aendern', {'delta': 6, 'grund': 'bietet Hilfe an'}),
    ], stop='tool_use')

def route(r):
    try:
        body = json.loads(r.request.post_data or '{}')
    except Exception:
        body = {}
    REQ.append(body)
    st, ct, text = answer(body)
    r.fulfill(status=st, headers={'content-type': ct, 'request-id': 'req_test'}, body=text)

def E(js): return pg.evaluate(js)
def J(js): return json.loads(pg.evaluate('JSON.stringify(' + js + ')'))
def steps(n, dt=0.1): E(f"for (let i = 0; i < {n}; i++) GAME.step({dt})")
def wait(cond, secs=30, step=True):
    t0 = time.time()
    while time.time() - t0 < secs:
        if E(cond): return True
        if step: E("GAME.step(0.05)")
        time.sleep(0.2)
    return False

with lib.browser() as b:
    pg = lib.page(b, 1100, 700, errs=errs)
    pg.route('**/__ki/**', route)
    lib.boot(pg, port, QUERY)
    base = f'http://localhost:{port}/__ki'
    ck('KI module loaded', E("!!(window.KI && KI.VOICE && KI.EAR)"))
    ck('menu button', E("!!document.getElementById('kibtn')"))
    ck('no SDK in the page itself (loaded on demand)', E("![...document.scripts].some(s => /anthropic-dangerous-direct-browser-access/.test(s.textContent))"))
    # without a key: the talk as before, with the hint to set it up
    E("KI.configure({ key: '', base: '', voice: 'aus', hands: false, on: true })")
    E("GAME.view(NPC.NPCS.hubert.x + 1.4, NPC.NPCS.hubert.y, 1.62, -90, -5); LIFE.force('hubert', 'off'); GAME.step(0.1)")
    E("NPC.NPCUI.start(NPC.NPCS.hubert)")
    wait("!NPC.NPCUI.busy()", 15)
    ck('without key: hint to set it up', E("!document.getElementById('np-setup').hidden"))
    ck('without key: small talk topics as before', E("document.querySelectorAll('#np-topics button').length > 2"), str(E("document.querySelectorAll('#np-topics button').length")))
    ck('without key: no conversation', E("!KI.conv"))
    E("NPC.NPCUI.end(false)")
    # with the stand-in
    E(f"KI.configure({{ key: '', base: '{base}', voice: 'aus', hands: false, on: true }})")
    E("KERN.emit('reset', {})")
    E("NPC.NPCUI.start(NPC.NPCS.hubert)")
    ck('conversation begins after the greeting', wait("!!KI.conv", 20), '')
    ck('KI controls in the panel', E("!document.getElementById('np-ki').hidden && !!document.getElementById('np-say')"))
    ck('small talk gives way to the free talk', E("[...document.querySelectorAll('#np-topics button')].every(b => b.className === 'quest' || b.className === 'bye')"))
    E("document.getElementById('np-say').value = 'Brauchst du Hilfe?'; document.getElementById('np-form').requestSubmit()")
    ok = wait("KI.conv && !KI.conv.busy && KI.conv.messages.length >= 4", 40)
    ck('one turn with tools answered', ok, f"{len(REQ)} requests")
    lib.shot(pg, OUT, 'talk')
    said = E("document.getElementById('np-text').textContent")
    ck('the answer in the panel', 'Rasen steht kniehoch' in said and 'sehen wir weiter' in said, said[:120])
    turns = [r for r in REQ if r.get('stream')]
    if turns:
        r0 = turns[0]
        ck('model Claude Haiku 5.5', r0.get('model') == 'claude-haiku-5-5', r0.get('model'))
        ck('no thinking, low effort', r0.get('thinking') == {'type': 'disabled'} and (r0.get('output_config') or {}).get('effort') == 'low')
        ck('system prompt cached, character first', (r0['system'][0].get('cache_control') or {}).get('type') == 'ephemeral' and 'Du bist Hubert' in r0['system'][0]['text'])
        ck('memory in the second system block', 'Deine Meinung über ihn: 35 von 100' in r0['system'][1]['text'], r0['system'][1]['text'][:100])
        ck('tools', [t['name'] for t in r0.get('tools', [])] == ['meinung_aendern', 'merken', 'aufgabe_geben', 'spielaufgabe', 'taetigkeit', 'gespraech_beenden'])
        u = r0['messages'][0]['content'][-1]['text']
        ck('situation before the words', u.startswith('<lage>') and u.endswith('Brauchst du Hilfe?') and 'Ort:' in u, u[:160].replace('\n', ' | '))
        ck('the greeting is known', 'begrüßt' in u)
        ck('du in the prompt', 'duzt' in r0['system'][0]['text'])
    if len(turns) > 1:
        r1 = turns[1]
        res = [b for b in r1['messages'][-1]['content'] if b.get('type') == 'tool_result']
        ck('tool results in the next request', len(res) == 3 and not any(b.get('is_error') for b in res), json.dumps(res, ensure_ascii=False)[:200])
        ck('history kept as it was (append-only)', r1['messages'][0] == turns[0]['messages'][0] and r1['messages'][1]['role'] == 'assistant')
    st = J("TASKS.state('ki-hubert-1')")
    ck('task given: running', bool(st) and st['st'] == 'läuft', str(st))
    jr = J("KERN.tasks.list().find(e => e.key === 'aufgaben:ki-hubert-1') || null")
    ck('task in the journal', bool(jr) and jr['who'] == 'Hubert', str(jr)[:160])
    ck('opinion up', E("KI.mem.who.hubert.meinung") == 41, str(E("KI.mem.who.hubert.meinung")))
    ck('note kept', E("KI.mem.who.hubert.notizen.some(n => /Hilfe angeboten/.test(n.text))"))
    # the end: summary and gossip
    n0 = len(REQ)
    E("NPC.NPCUI.end(true)")
    ck('summary after the talk', wait("KI.mem.who.hubert.gespraeche.length === 1", 20), f"{len(REQ) - n0} requests")
    ck('gossip waiting for the table', E("KI.mem.who.hubert.klatsch.length") == 1)
    sreq = [r for r in REQ[n0:] if (r.get('output_config') or {}).get('format')]
    ck('summary as structured output', bool(sreq) and sreq[0]['output_config']['format']['type'] == 'json_schema')
    # the task: the step by its event, then back to Hubert
    E("KERN.emit('garage:gemaeht', { m2: 12 })")
    st = J("TASKS.state('ki-hubert-1')")
    ck('step done by the event', bool(st) and st['i'] == 1, str(st))
    E("KI.configure({ base: '' })")   # no conversation now: the talk only finishes the task
    E("KERN.emit('talk', { who: 'hubert' })")
    st = J("TASKS.state('ki-hubert-1')")
    ck('task done after telling Hubert', bool(st) and st['st'] == 'erledigt', str(st))
    ck('reward', E("KI.mem.who.hubert.meinung") == 51, str(E("KI.mem.who.hubert.meinung")))
    ck('he knows it next time', E("KI.mem.who.hubert.neu.includes('Rasen mähen für Hubert')"))
    # the two at the table: Hubert tells Ronald
    E("LIFE.force('hubert', 'talk'); LIFE.force('ronald', 'visit')")
    E("GAME.view(-9, 12, 1.62, -90, -5)")
    told = False
    t0 = time.time()
    while time.time() - t0 < 240:
        E("for (let i = 0; i < 40; i++) GAME.step(0.1)")
        if E("KI.mem.who.hubert.klatsch.length === 0"): told = True; break
    ck('gossip told at the table', told, str(J("{ h: LIFE.cur('hubert'), r: LIFE.cur('ronald'), talk: LIFE.TALK.on }")))
    ck('Ronald remembers what Hubert told', E("KI.mem.who.ronald.notizen.some(n => n.von === 'hubert')"))
    ck("Ronald's opinion moved", E("KI.mem.who.ronald.meinung") == 49, str(E("KI.mem.who.ronald.meinung")))
    E("LIFE.force('hubert', null); LIFE.force('ronald', null)")
    # a refused key
    E(f"KI.configure({{ base: '{base}' }})")
    MODE['auth'] = True
    E("GAME.view(NPC.NPCS.hubert.x + 1.4, NPC.NPCS.hubert.y, 1.62, -90, -5); LIFE.force('hubert', 'off'); GAME.step(0.1)")
    E("NPC.NPCUI.start(NPC.NPCS.hubert)")
    wait("!!KI.conv", 20)
    E("KI.turn('Hallo Hubert')")
    wait("KI.conv && !KI.conv.busy", 20)
    note = E("document.getElementById('np-note').textContent")
    ck('refused key: said in the panel', 'Schlüssel' in note, note)
    ck('refused key: history back as before', E("KI.conv ? KI.conv.messages.length : -1") == 0)
    E("NPC.NPCUI.end(false)")
    MODE['auth'] = False
    # settings panel
    E("KI.settings(true)")
    ck('settings panel', E("!document.getElementById('kipanel').hidden && /Hubert \\d+/.test(document.querySelector('#kipanel .kmeinung').textContent)"))
    ck('settings: the voices of the people', E("document.querySelectorAll('#ki-stimme .strow').length") >= 10, str(E("document.querySelectorAll('#ki-stimme .strow').length")))
    lib.shot(pg, OUT, 'settings')
    E("KI.settings(false)")
    # reset: the neighbours forget
    E("KERN.emit('reset', {})")
    ck('reset: memory anew', E("KI.mem.who.hubert.meinung === 35 && !KI.mem.tasks.length"))
    # a villager: the free talk in the village's panel, the task, the village hears of it
    E(f"KI.configure({{ base: '{base}' }})")
    n0 = len(REQ)
    E("DORF.UI.open('gerhard')")
    ck('villager: conversation begins', wait("!!KI.conv && KI.conv.who === 'gerhard'", 10))
    ck('villager: microphone in the village panel', E("document.getElementById('dorfpanel').contains(document.getElementById('np-ki')) && !document.getElementById('np-ki').hidden"))
    ck('villager: small talk gives way', E("[...document.querySelectorAll('#dorfpanel .topics button')].every(b => /quest|bye/.test(b.className))"))
    # the box looks as in the neighbours' panel (Falko, 26.10.: in the village only an empty square instead of the microphone)
    st = J("(() => { const m = document.getElementById('np-mic'), r = m.getBoundingClientRect(), sv = m.querySelector('svg').getBoundingClientRect(); return { hidden: m.hidden, w: r.width, h: r.height, svg: sv.width, round: getComputedStyle(document.getElementById('np-say')).borderRadius }; })()")
    ck('villager: the microphone drawn as with Hubert (40 px, icon 20 px, round field)', (st['hidden'] or (st['w'] >= 38 and st['svg'] >= 18)) and st['round'] == '999px', json.dumps(st))
    pg.screenshot(path=os.path.join(OUT, 'dorf_ki.png'))
    E("KI.turn('Erzähl mal von der Chronik')")
    wait("KI.conv && !KI.conv.busy && KI.conv.messages.length >= 4", 40)
    vr = [r for r in REQ[n0:] if r.get('stream')]
    ck('villager: his character', bool(vr) and 'Du bist Gerhard Möller' in vr[0]['system'][0]['text'] and 'Dorfchronik' in vr[0]['system'][0]['text'])
    ck('villager: no activity tool, no old tasks', bool(vr) and not any(t['name'] in ('taetigkeit', 'spielaufgabe') for t in vr[0]['tools']))
    ck('villager: opinion from the campaign', E("KI.mem.who.gerhard.meinung") > 0, str(E("KI.mem.who.gerhard.meinung")))
    ck('villager: task in the journal', E("!!TASKS.state('ki-gerhard-1')"))
    ck('villager: the answer in the village panel', 'Rasen steht kniehoch' in E("document.querySelector('#dorfpanel .say').textContent"))
    E("DORF.UI.close()")
    ck('villager: summary', wait("KI.mem.who.gerhard.gespraeche.length === 1", 20))
    ck('the village hears of it', E("Object.values(KI.mem.who).some(w => w.notizen.some(n => n.von === 'gerhard'))"))
    # the key entered while a panel is open (the hint there leads to the settings – Falko on the iPhone, 26.10.): when the settings close,
    # that talk turns free at once
    E("KI.configure({ base: '' })")
    E("DORF.UI.open('ingrid')")
    ck('no key: the hint in the village panel', E("document.getElementById('dorfpanel').contains(document.getElementById('np-setup')) && !document.getElementById('np-setup').hidden"))
    ck('no key: small talk in the village panel', E("[...document.querySelectorAll('#dorfpanel .topics button')].some(b => !/quest|bye/.test(b.className))"))
    E("document.getElementById('np-setup').click()")
    ck('the hint opens the settings', E("!document.getElementById('kipanel').hidden"))
    E(f"(i => {{ i.value = '{base}'; i.dispatchEvent(new Event('input', {{ bubbles: true }})) }})(document.getElementById('ki-base'))")
    ck('typed: kept at once, the field stays', E("JSON.parse(localStorage.getItem('pav-ki-set-v1')).base.endsWith('/__ki') && !!document.getElementById('ki-base')"))
    ck('no talk while the settings are open', E("!KI.conv"))
    E("document.querySelector('#kipanel [data-ki=close]').click()")
    ck('settings closed: Ingrid talks freely', wait("!!KI.conv && KI.conv.who === 'ingrid'", 10))
    ck('settings closed: small talk gives way', E("[...document.querySelectorAll('#dorfpanel .topics button')].every(b => /quest|bye/.test(b.className))"))
    ck('settings closed: microphone in the panel, no hint', E("!document.getElementById('np-ki').hidden && document.getElementById('dorfpanel').contains(document.getElementById('np-ki')) && document.getElementById('np-setup').hidden"))
    E("DORF.UI.close()")
    # fixed lines: recorded ones known (tools/voices/record_lines.py, loaded when said), the rest read in the person's voice
    ck('recorded fixed lines known', E("(window.VOICEX && VOICEX.lines || []).length") >= 250, str(E("(window.VOICEX && VOICEX.lines || []).length")))
    ck('a villager line will be spoken', E("STIMME.speaks('heike', VOICEX.lines.find(l => l.who === 'heike').text)"))
    # voices: one per person, women and men
    ck('voices: profiles', E("STIMME.profile('katrin').g === 'f' && STIMME.profile('hubert').g === 'm' && STIMME.profile('gerhard').age === 72"))
    # volumes: sliders in the menu, saved
    ck('volume sliders in the menu', E("document.querySelectorAll('#volbox input[data-vol]').length") == 5)
    E("const r = document.querySelector('#volbox input[data-vol=stimmen]'); r.value = '40'; r.dispatchEvent(new Event('input'))")
    ck('volume saved', E("JSON.parse(localStorage.getItem('pav-ton-v1') || '{}').stimmen") == 0.4, E("localStorage.getItem('pav-ton-v1')"))
    ck.errors(errs)
ck.done()
