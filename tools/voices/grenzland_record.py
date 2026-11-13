# Records the fixed spoken lines of the mode „Grenzland“ (tools/voices/grenzland_linien.json, made by grenzland_linien.mjs) with a natural
# Microsoft Edge voice per person (edge-tts, free, private use) – on GitHub Actions (.github/workflows/stimmen_grenzland.yml; the chat
# machine cannot reach the speech service). Writes the feature extra
#   viz3/extra/grenzland-stimmen/dist/snd/voice/gl/<id>.mp3   one file per line (loaded in the game only when the line is said)
#   viz3/extra/grenzland-stimmen/manifest.json                {"vx": {"voices": {who: voice}}, "vx_add": [{who, id, text, file, dur}]}
#                                                             (viz3/build.py appends vx_add to the village's VOICEX.lines)
#   viz3/extra/grenzland-stimmen/aufnahmen.json               per id: voice settings, seconds, loudness, bytes (what to record again)
# Only what is new or changed is recorded (same id = same words; same voice, pace, pitch and sound: the file stays); lines no longer in the
# list go. The budget (all files ≤ 12 MB, each < 5 MB): the story (prio 1) and the world (2) always, then as far as it goes the reactions of the story's
# people (2.5), the talk stations (3), the reactions of everybody else (3.5), the other stations (4) – 2.5, 3.5 and 4 a whole person each.
#   python3 tools/voices/grenzland_record.py        (GL_BUDGET=bytes, GL_ONLY=<who,…> to try a few people, GL_DRY=1 nothing recorded)
import asyncio, json, os, re, subprocess, sys, zlib
from itertools import groupby
H = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(H, '..', '..'))
EX = os.path.join(ROOT, 'viz3', 'extra', 'grenzland-stimmen'); OUT = os.path.join(EX, 'dist', 'snd', 'voice', 'gl')
TMP = os.path.join(ROOT, 'out', 'grenzland-stimmen')
BUDGET = int(os.environ.get('GL_BUDGET', 11_600_000))   # the MP3 files; with the two lists the folder stays under 12 MB (lead, 13.11. ~14:00)
FX = 'fx1'   # the version of the sound chains below: a new one records everything again

# ---- the cast: who → (voices, the first one edge-tts offers; rate; pitch; kind) ----
# kind: 'p' a person in the world, 'r' a radio presenter (the sound of a broadcast), 'f' the police radio (band-pass, drive, squelch).
# edge-tts offers three German men (Conrad, Killian, Florian), the Austrian Jonas and the Swiss Jan, the women Katja, Amala, Seraphina,
# Ingrid (AT), Leni (CH); the multilingual US voices speak German with a light accent (the village has Andrew for Gerhard, Brian for
# Wolfgang). People who meet in a scene get different voices; one voice for two people only where they never meet, then with another
# pace and pitch. Falko and Sarah are real people (Sarah agreed 13.11.2026 10:44): the most natural German voices, unchanged.
CAST = {
    # the two one plays
    # (Florian gave no audio for most lines on 13.11.2026 – then Conrad takes all of Falko's lines; the stranger is therefore not Conrad)
    'gl_falko': (['de-DE-FlorianMultilingualNeural', 'de-DE-ConradNeural'], '+0%', '-1Hz', 'p'),
    'gl_sarah': (['de-DE-SeraphinaMultilingualNeural', 'de-DE-KatjaNeural'], '+0%', '+0Hz', 'p'),
    # today
    'gl_fremder': (['de-DE-KillianNeural'], '-8%', '-12Hz', 'p'),                     # 55, calm, a little too friendly
    'gl_jule': (['de-DE-KatjaNeural', 'de-DE-AmalaNeural'], '+5%', '+1Hz', 'p'),     # 26, leads the clique, quick
    'gl_timo': (['de-DE-KillianNeural'], '+6%', '+2Hz', 'p'),                         # 24, the joker
    'gl_basti': (['de-AT-JonasNeural', 'de-DE-KillianNeural'], '-8%', '-6Hz', 'p'),  # 22, says four words a day
    'gl_gerhard': (['en-US-AndrewMultilingualNeural'], '-10%', '-6Hz', 'p'),   # 72: his voice in the village (record_lines.py), no other
    'gl_gerhard89': (['en-US-AndrewMultilingualNeural'], '-2%', '-1Hz', 'p'),  # the same man at 35, in 1989
    'gl_kraeh': (['en-US-BrianMultilingualNeural', 'de-DE-ConradNeural'], '-6%', '-8Hz', 'p'),
    'gl_wache1': (['de-CH-JanNeural', 'de-DE-KillianNeural'], '-4%', '-8Hz', 'p'),
    'gl_wache2': (['en-US-BrianMultilingualNeural', 'de-DE-KillianNeural'], '-2%', '-6Hz', 'p'),
    'gl_wache3': (['de-AT-JonasNeural', 'de-DE-KillianNeural'], '-4%', '-9Hz', 'p'),
    'gl_polizei1': (['de-CH-JanNeural', 'de-DE-KillianNeural'], '+0%', '-3Hz', 'p'),
    'gl_polizei2': (['de-AT-IngridNeural', 'de-DE-AmalaNeural'], '+2%', '+0Hz', 'p'),
    'gl_yuki': (['de-CH-LeniNeural', 'de-DE-AmalaNeural'], '+2%', '+2Hz', 'p'),
    'gl_haendler': (['de-DE-AmalaNeural'], '-4%', '-4Hz', 'p'),
    # the people of welt's random events (as the first recording gave them, the landlord no longer Florian)
    'gl_boellermann': (['de-CH-JanNeural', 'de-AT-JonasNeural'], '+1%', '+1Hz', 'p'),   # 47, sells bangers from his boot
    'gl_wirt': (['de-DE-KillianNeural'], '-5%', '-7Hz', 'p'),                           # Bratwurst-Uwe, 56
    'gl_bursche': (['de-AT-JonasNeural', 'de-DE-KillianNeural'], '+3%', '+0Hz', 'p'),  # 21, the fair
    'gl_maedchen': (['de-DE-AmalaNeural', 'de-DE-KatjaNeural'], '+6%', '+3Hz', 'p'),   # 20, the fair
    # 1989 (Gerhard is played, he does not speak there; the others never meet today's people)
    'gl_lutz': (['de-DE-KillianNeural'], '-2%', '-3Hz', 'p'),
    'gl_abv': (['de-DE-ConradNeural'], '-4%', '-6Hz', 'p'),
    'gl_vopo': (['de-AT-JonasNeural', 'de-DE-KillianNeural'], '+2%', '+0Hz', 'p'),
    'gl_horst': (['de-CH-JanNeural', 'de-DE-ConradNeural'], '-6%', '-5Hz', 'p'),
    'gl_werner': (['de-DE-KillianNeural'], '-6%', '-8Hz', 'p'),
    'gl_kurt': (['en-US-BrianMultilingualNeural', 'de-DE-ConradNeural'], '-14%', '-10Hz', 'p'),
    'gl_maik': (['de-DE-KillianNeural'], '+10%', '+5Hz', 'p'),
    'gl_erna': (['de-DE-AmalaNeural'], '-8%', '-8Hz', 'p'),
    'gl_renate': (['de-DE-KatjaNeural'], '+0%', '-2Hz', 'p'),
    'gl_brigitte': (['de-AT-IngridNeural', 'de-DE-AmalaNeural'], '-4%', '-4Hz', 'p'),
    'gl_gisela': (['de-DE-SeraphinaMultilingualNeural', 'de-DE-KatjaNeural'], '-2%', '-3Hz', 'p'),
    'gl_ines': (['de-CH-LeniNeural', 'de-DE-AmalaNeural'], '+6%', '+4Hz', 'p'),
    # the villagers, should a module let them speak in Grenzland ('gl_' + their key): their voices of the village (record_lines.py)
    'gl_hubert': (['de-DE-ConradNeural'], '-10%', '-8Hz', 'p'),
    'gl_ronald': (['de-DE-FlorianMultilingualNeural'], '+2%', '-2Hz', 'p'),
    'gl_manfred': (['de-DE-KillianNeural'], '-4%', '-6Hz', 'p'),
    'gl_wolfgang': (['en-US-BrianMultilingualNeural', 'de-DE-KillianNeural'], '-6%', '-6Hz', 'p'),
    'gl_uwe': (['de-AT-JonasNeural', 'de-DE-KillianNeural'], '+0%', '-2Hz', 'p'),
    'gl_jens': (['de-DE-KillianNeural'], '+7%', '+3Hz', 'p'),
    'gl_katrin': (['de-DE-KatjaNeural', 'de-DE-AmalaNeural'], '+2%', '+0Hz', 'p'),
    'gl_ingrid': (['de-DE-AmalaNeural', 'de-DE-SeraphinaMultilingualNeural'], '-4%', '-6Hz', 'p'),
    'gl_heike': (['de-DE-SeraphinaMultilingualNeural', 'de-DE-AmalaNeural'], '+0%', '-2Hz', 'p'),
    # the police radio: the control room „Rennsteig“ (a woman) – a patrol's lines get the patrol's voice (FUNK_PATROL below)
    'gl_funk': (['de-DE-KatjaNeural', 'de-DE-AmalaNeural'], '-2%', '-2Hz', 'f'),
    # the radio's presenters (grenzland/gl_radio_data.js SENDER: who speaks on which station)
    'gl_r_grenzland': (['en-US-BrianMultilingualNeural', 'de-DE-KillianNeural'], '+8%', '+3Hz', 'r'),   # Matze, 45, local radio
    'gl_r_kirmes': (['de-AT-IngridNeural', 'de-DE-AmalaNeural'], '-3%', '-3Hz', 'r'),                   # Gundula, 58, Schlager
    'gl_r_klassik': (['de-DE-KatjaNeural'], '-10%', '-6Hz', 'r'),                                       # Frau Dr. Sommerlatte, 61
    'gl_r_zweitakt': (['de-DE-KillianNeural'], '+10%', '+1Hz', 'r'),                                    # Ecki, 52, rock
    'gl_r_blasius': (['de-AT-JonasNeural', 'de-DE-ConradNeural'], '-6%', '-4Hz', 'r'),                  # Schorsch, 63, brass band
    'gl_r_neon': (['en-US-EmmaMultilingualNeural', 'de-DE-SeraphinaMultilingualNeural'], '+4%', '+2Hz', 'r'),  # Synthia, 31
    'gl_r_republik': (['de-DE-ConradNeural'], '-4%', '-4Hz', 'r'),                                      # 1989: the GDR's news reader
    'gl_r_impuls': (['de-DE-AmalaNeural'], '+8%', '+4Hz', 'r'),                                         # 1989: Kati, 24, youth radio
    'gl_r_west': (['en-US-AndrewMultilingualNeural', 'de-DE-KillianNeural'], '+6%', '+3Hz', 'r'),  # 1989: Wolfi, the West
}
# a patrol on the police radio („Schleuse 12 …“, „Bussard 1 …“, „Verstanden …“) – the control room says the rest
FUNK_PATROL = (['de-DE-KillianNeural'], '+2%', '-5Hz')
PATROL = re.compile(r'^(Schleuse \d+|Bussard \d+|Verstanden)\b')
# the squelch: before a line that opens a transmission (a call sign first), after one that closes it – a description told in fragments
# (grenzland/gl_fahndung.js: „Zentrale an alle Streifen.“ · „Gesucht wird …,“ · … · „Kommen.“) clicks only at its two ends
CALL = re.compile(r'^(Rennsteig|Zentrale|Hier Zentrale|Schleuse \d+|Bussard \d+|Verstanden)\b')
def squelch(text):
    t = text.strip(); i = bool(CALL.match(t)); o = t == 'Kommen.' or (i and not t.endswith('an alle Streifen.'))
    return 'f' if i and o else 'fi' if i else 'fo' if o else 'fm'
# someone not in the table (a module's new speaker): a voice of the right gender, by the name's hash; pace and pitch by age
# (not Florian: on 13.11.2026 it gave no audio for most lines)
POOL = {'m': ['de-DE-KillianNeural', 'de-AT-JonasNeural', 'de-CH-JanNeural', 'de-DE-ConradNeural', 'en-US-BrianMultilingualNeural'],
        'f': ['de-DE-KatjaNeural', 'de-DE-AmalaNeural', 'de-AT-IngridNeural', 'de-CH-LeniNeural', 'de-DE-SeraphinaMultilingualNeural']}
# the sound of each kind: the filter after the trimmed silence, the target loudness, sample rate, bit rate (bytes per second for the budget)
TRIM = ('silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,'
        'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12,areverse')
KIND = {
    'p': {'af': 'highpass=f=75,loudnorm=I=-17:TP=-1.5:LRA=9', 'ar': 24000, 'br': '40k', 'bps': 5000},
    'r': {'af': ('highpass=f=120,lowpass=f=7000,acompressor=threshold=-21dB:ratio=3:attack=6:release=120:makeup=2,'
                 'equalizer=f=2800:t=q:w=1.4:g=2.5,loudnorm=I=-18:TP=-1.5:LRA=7'), 'ar': 16000, 'br': '24k', 'bps': 3000},
    # the police radio: a squelch burst before and after, telephone band, compressed and driven
    'f': {'af': ('highpass=f=320,highpass=f=320,lowpass=f=3300,lowpass=f=3300,'
                 'acompressor=threshold=-26dB:ratio=8:attack=2:release=50:makeup=6,asoftclip=type=atan,'
                 'highpass=f=300,lowpass=f=3400,lowpass=f=3400,loudnorm=I=-19:TP=-2:LRA=6'), 'ar': 16000, 'br': '24k', 'bps': 3000},
}

FEM = re.compile(r'Katja|Amala|Seraphina|Ingrid|Leni|Emma|Ava|Elke|Tanja')
def h32(s): return zlib.crc32(s.encode('utf8'))
def unit(p): return p >= 4 or p % 1 == 0.5   # a whole person or nothing
def setting(l, cast, have):
    """(voice, rate, pitch, kind) of a line"""
    w = l['who']
    if w in CAST:
        pref, rate, pitch, kind = CAST[w]
        if kind == 'f':
            if PATROL.match(l['text']): pref, rate, pitch = FUNK_PATROL
            kind = squelch(l['text'])
    else:
        c = cast.get(w, {}); g = c.get('g') if c.get('g') in POOL else ('f' if h32(w) % 2 else 'm'); age = c.get('age') or 40
        pool = POOL[g]; pref = [pool[h32(w) % len(pool)]] + pool
        j = h32(w) % 7 - 3
        rate = '%+d%%' % ((-8 if age >= 65 else 6 if age < 30 else 0) + j); pitch = '%+dHz' % ((-6 if age >= 65 else 3 if age < 30 else 0) + j)
        kind = 'r' if w.startswith('gl_r_') else squelch(l['text']) if w.startswith('gl_funk') else 'p'
    if kind == 'p' and l.get('prio', 2) % 1 == 0.5: kind = 'pq'
    g = 'f' if FEM.search(pref[0]) else 'm'
    voice = next((v for v in pref if v in have), None) or next((v for v in POOL[g] if v in have), None)
    return voice, rate, pitch, kind

async def tts(text, voice, rate, pitch, raw, tries=4):
    import edge_tts
    for k in range(tries):
        try:
            await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(raw)
            if os.path.getsize(raw) > 1000: return True
        except Exception as e:
            print('retry', k, voice, e, flush=True)
        await asyncio.sleep(1.5 + 2 * k)
    return False

KIND.update({k: KIND['f'] for k in ('fi', 'fo', 'fm')})
# the many small reactions (welt): a person's sound at 16 kHz, 24 kbit/s (heard in the street, often from a few metres)
KIND['pq'] = dict(KIND['p'], ar=16000, br='24k', bps=3000)
def encode(raw, mp3, kind):
    K = KIND[kind]
    if kind.startswith('f'):
        MONO = 'aformat=sample_fmts=fltp:channel_layouts=mono'
        parts = [f'[0:a]{TRIM},aresample=24000,{MONO}[v]']; seq = '[v]'
        if kind in ('f', 'fi'): parts.append(f'anoisesrc=d=0.07:c=white:a=0.3:r=24000,{MONO}[n1]'); seq = '[n1]' + seq
        if kind in ('f', 'fo'): parts.append(f'anoisesrc=d=0.16:c=white:a=0.3:r=24000,afade=t=out:st=0.05:d=0.11,{MONO}[n2]'); seq += '[n2]'
        fc = ';'.join(parts) + f';{seq}concat=n={seq.count("[")}:v=0:a=1,{K["af"]}[o]'
        cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-filter_complex', fc, '-map', '[o]']
    else:
        cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', TRIM + ',' + K['af']]
    subprocess.run(cmd + ['-ac', '1', '-ar', str(K['ar']), '-b:a', K['br'], mp3], check=True)

# seconds a line should take at this pace (14 characters a second at +0 %, as the village's recordings)
def expect(text, rate): return max(0.4, len(text) / 14 / (1 + int(rate.rstrip('%')) / 100))
# a recording that is sound: not silent, not cut short (the service sometimes sends a stump)
def sound(a, text, rate): return a.get('lufs') is not None and a['lufs'] > -45 and a.get('dur', 0) >= max(0.25, 0.3 * expect(text, rate))
def dur(f): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip() or 0)
def lufs(f):
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', e)
    return float(m[-1]) if m else None

async def main():
    os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
    doc = json.load(open(os.path.join(H, 'grenzland_linien.json')))
    lines, cast = doc['lines'], doc.get('cast', {})
    only = [w for w in os.environ.get('GL_ONLY', '').split(',') if w]
    if os.environ.get('GL_DRY'):
        have = {v for pref, *_ in CAST.values() for v in pref} | {v for p in POOL.values() for v in p} | set(FUNK_PATROL[0])
    else:
        import edge_tts
        have = {v['ShortName'] for v in await edge_tts.list_voices()}
        print('German and multilingual voices:', ' '.join(sorted(v for v in have if v.startswith('de-') or 'Multilingual' in v)), flush=True)
    af = os.path.join(EX, 'aufnahmen.json')
    old = json.load(open(af)) if os.path.exists(af) else {}
    # a voice that gave no audio for a person: the person's next voice, for all their lines (kept in aufnahmen.json '_bad')
    bad = old.pop('_bad', {})
    def plan():
        """the budget: in the order of prio (the collector's order within one), the files that stay count with their size, new ones
        estimated → want {id: (line, voice, rate, pitch, kind, sig, mp3, keep)}, the ids to record, the lines over the budget.
        Prio 2.5, 3.5 and 4 go person by person – all of one's lines or none (one station or one villager with a natural line among
        device-voice ones sounds wrong)"""
        order = sorted(range(len(lines)), key=lambda i: (lines[i].get('prio', 2), i))
        want, total, cut, todo, items = {}, 0, [], [], []
        def take(l, st, size):
            nonlocal total
            total += size
            want[l['id']] = (l,) + st
            if not st[-1]: todo.append(l['id'])
        for i in order:
            l = lines[i]
            voice, rate, pitch, kind = setting(l, cast, have - set(bad.get(l['who'], [])))
            if not voice: print('no voice for', l['who']); continue
            sig = '|'.join([voice, rate, pitch, kind, FX])
            mp3 = os.path.join(OUT, l['id'] + '.mp3')
            a = old.get(l['id'], {})
            keep = a.get('sig') == sig and os.path.exists(mp3) and sound(a, l['text'], rate)
            if only and l['who'] not in only and not keep: continue
            size = os.path.getsize(mp3) if keep else int(expect(l['text'], rate) * KIND[kind]['bps']) + 800
            items.append((l, (voice, rate, pitch, kind, sig, mp3, keep), size))
        for p, grp in groupby(items, key=lambda e: e[0].get('prio', 2)):
            grp = list(grp)
            if unit(p):
                persons = {}
                for e in grp: persons.setdefault(e[0]['who'], []).append(e)
                for w, U in persons.items():
                    if total + sum(u[2] for u in U) > BUDGET: cut += [u[0] for u in U]; continue
                    for u in U: take(*u)
            else:
                # (a talk station's lines in their order – the claims, the presenter, the police report first, adverts last – until
                # the first that does not fit; no gaps filled with a later short line)
                full = False
                for e in grp:
                    if p >= 3 and (full or total + e[2] > BUDGET): full = True; cut.append(e[0]); continue
                    take(*e)
        return want, todo, cut, total
    want, todo, cut, total = plan()
    print(f'{len(want)} lines wanted ({len(todo)} to record), ≈ {total / 1e6:.2f} MB of {BUDGET / 1e6:.2f} MB; {len(cut)} lines over the budget (they keep the device voice)', flush=True)
    if os.environ.get('GL_DRY'):
        for k in todo[:12]: l, voice, rate, pitch, kind, *_ = want[k]; print('  would record', l['who'], voice, rate, pitch, kind, l['text'][:60])
        per = {}
        for l in lines: per.setdefault((l.get('prio', 2), l['who']), [0, 0])[0 if l['id'] in want else 1] += 1
        print('  (prio, who): [wanted, over the budget]', sorted(per.items()))
        return
    async def one(k, sem, tries):
        l, voice, rate, pitch, kind, sig, mp3, keep = want[k]
        raw = os.path.join(TMP, k + '.raw.mp3')
        async with sem:
            ok = await tts(l['text'].replace('…', ','), voice, rate, pitch, raw, tries)
        if not ok: print('FAILED', k, voice, flush=True); return False
        await asyncio.to_thread(encode, raw, mp3, kind)
        a = {'sig': sig, 'voice': voice, 'rate': rate, 'pitch': pitch, 'kind': kind, 'dur': round(dur(mp3), 2), 'lufs': lufs(mp3),
             'bytes': os.path.getsize(mp3)}
        if not sound(a, l['text'], rate):
            print('BROKEN', k, voice, a['dur'], 's', a['lufs'], 'LUFS', flush=True); os.remove(mp3); return False
        old[k] = a
        print('ok', k, a['dur'], 's', a['lufs'], 'LUFS', flush=True)
        return True
    async def runs(ids, par, tries):
        sem = asyncio.Semaphore(par)
        res = await asyncio.gather(*(one(k, sem, tries) for k in ids))
        return [k for k, r in zip(ids, res) if not r]
    async def again(ids):
        """what failed, one at a time, a person's voice after the other – a voice that fails twice in a row is given up at once (its
        remaining lines count as failed: the person then gets the next voice)"""
        out, by = [], {}
        for k in ids: by.setdefault((want[k][0]['who'], want[k][1]), []).append(k)
        sem = asyncio.Semaphore(1)
        for (w, v), ks in by.items():
            # (a person without another voice – Gerhard keeps his voice of the village – gets more patience instead)
            alt = any(x in have and x != v and x not in bad.get(w, []) for x in CAST.get(w, ([],))[0])
            row = 0
            for i, k in enumerate(ks):
                if await one(k, sem, 3 if alt else 6): row = 0; continue
                out.append(k); row += 1
                if alt and row >= 2: out += ks[i + 1:]; print('giving up', v, 'for', w, flush=True); break
        return out
    # 1: four at a time; 2: what failed, one at a time; 3: who still has a line without audio gets the next voice of the list for all
    # their lines (one voice per person), recorded the same way
    failed = await runs(todo, 4, 3)
    if failed: failed = await again(failed)
    switch = {}
    for k in failed:
        l, voice = want[k][0], want[k][1]
        pref = CAST.get(l['who'], ([],))[0]
        rest = [v for v in pref if v in have and v != voice and v not in bad.get(l['who'], [])]
        if rest and l['who'] not in switch: switch[l['who']] = voice
    if switch:
        for w, v in switch.items(): bad.setdefault(w, []).append(v); print('voice switched for', w, 'from', v, flush=True)
        want, todo2, cut, total = plan()
        todo += [k for k in todo2 if k not in todo]
        redo = [k for k in todo2 if want[k][0]['who'] in switch]
        failed = [k for k in failed if want.get(k) and want[k][0]['who'] not in switch]
        f3 = await runs(redo, 3, 3)
        if f3: f3 = await again(f3)
        failed += f3
    for k in failed: print(f'::warning title=grenzland_record::no audio for {k} ({want[k][1]}): {want[k][0]["text"][:80]}', flush=True)
    # what is no longer wanted goes
    for f in os.listdir(OUT):
        if f.endswith('.mp3') and f[:-4] not in want: os.remove(os.path.join(OUT, f)); old.pop(f[:-4], None); print('removed', f)
    for k in list(old):
        if k not in want: old.pop(k)
    # the estimate was a guess: over the budget, the last ones go again – a whole person of prio 2.5, 3.5, 4, else the talk stations'
    # last lines
    size = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    def drop(k):
        nonlocal size
        if os.path.exists(want[k][6]): size -= os.path.getsize(want[k][6]); os.remove(want[k][6])
        cut.append(want.pop(k)[0]); old.pop(k, None)
    for k in sorted(want, key=lambda k: (want[k][0].get('prio', 2), lines.index(want[k][0])), reverse=True):
        if size <= BUDGET or k not in want or want[k][0].get('prio', 2) < 3: continue
        if unit(want[k][0].get('prio', 2)):
            w = want[k][0]['who']
            for j in [j for j in want if want[j][0]['who'] == w]: drop(j)
        else: drop(k)
    # the manifest: the lines in the collector's order (the story first), the voices of the people
    vx_add, voices = [], {}
    for l in lines:
        w = want.get(l['id'])
        if not w or l['id'] in failed or not os.path.exists(w[6]) or l['id'] not in old: continue
        vx_add.append({'who': l['who'], 'id': l['id'], 'text': l['text'], 'file': 'voice/gl/' + l['id'] + '.mp3', 'dur': old[l['id']]['dur']})
        if not (w[4].startswith('f') and PATROL.match(l['text'])): voices.setdefault(l['who'], w[1])
    json.dump({'vx': {'voices': voices}, 'vx_add': vx_add}, open(os.path.join(EX, 'manifest.json'), 'w'), ensure_ascii=False, indent=0)
    if bad: old['_bad'] = bad
    json.dump(old, open(af, 'w'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    old.pop('_bad', None)
    size = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'DONE {len(vx_add)} lines, {len(todo) - len(failed)} new, {len(failed)} failed, {size / 1e6:.2f} MB', flush=True)
    print(f'::notice title=grenzland_record::{len(vx_add)} lines recorded, {len(todo) - len(failed)} new, {len(failed)} without audio, '
          f'{len(cut)} radio lines over the budget, {size / 1e6:.2f} MB' + (f'; voices switched: {switch}' if switch else ''), flush=True)
    summary(lines, want, old, todo, failed, cut, size)
    folder = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(EX) for f in fs)
    print(f'the folder viz3/extra/grenzland-stimmen: {folder / 1e6:.2f} MB')
    if folder > 12_000_000: print('::warning title=grenzland_record::the folder is over 12 MB – lower GL_BUDGET')

def summary(lines, want, old, todo, failed, cut, size):
    """the job summary: the new lines (line, voice, seconds, loudness), per person, what is over the budget"""
    rows = ['## Grenzland-Stimmen', '', f'{len(want)} Sätze aufgenommen ({len(todo) - len(failed)} neu, {len(failed)} fehlgeschlagen), {size / 1e6:.2f} MB; '
            f'{len(cut)} Radio-Sätze über dem Budget.', '', '| wer | Stimme | Tempo | Höhe | s | LUFS | Satz |', '|---|---|---|---|---|---|---|']
    def row(l):
        a = old.get(l['id'], {})
        return f"| {l['who'][3:]} | {a.get('voice', '').replace('Neural', '')} | {a.get('rate', '')} | {a.get('pitch', '')} | {a.get('dur', '')} | {a.get('lufs', '')} | {l['text'][:70].replace('|', '/')} |"
    new = [l for l in lines if l['id'] in todo and l['id'] in old]
    rows += [row(l) for l in new[:400]]
    per = {}
    for l in lines:
        a = old.get(l['id'])
        if l['id'] in want and a: p = per.setdefault(l['who'], [a['voice'], a['rate'], a['pitch'], 0, 0.0, 0]); p[3] += 1; p[4] += a['dur']; p[5] += a['bytes']
    rows += ['', '### Je Person', '', '| wer | Stimme | Tempo | Höhe | Sätze | s | KB |', '|---|---|---|---|---|---|---|']
    rows += [f'| {w[3:]} | {p[0].replace("Neural", "")} | {p[1]} | {p[2]} | {p[3]} | {round(p[4])} | {round(p[5] / 1000)} |' for w, p in per.items()]
    if cut: rows += ['', '### Über dem Budget (Gerätestimme)', ''] + [f"- {l['who'][3:]}: {l['text'][:90]}" for l in cut]
    if failed: rows += ['', '### Fehlgeschlagen', ''] + [f'- {k}' for k in failed]
    text = '\n'.join(rows) + '\n'
    print(text)
    if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(text)

if __name__ == '__main__':
    asyncio.run(main())
