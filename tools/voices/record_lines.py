# Records the fixed lines of tools/voices/linien.json (made by linien.mjs: the villagers, Hubert's and Ronald's table talk, muttering and
# newer task lines) with a natural Microsoft Edge voice per person (edge-tts, free, private use) – on GitHub Actions
# (.github/workflows/stimmen.yml; the chat machine cannot reach the speech service). Writes the feature extra
#   viz3/extra/saetze/dist/snd/voice/x/<id>.mp3   one file per line (loaded in the game only when the line is said)
#   viz3/extra/saetze/manifest.json                {"vx": {"voices": {who: voice}, "lines": [{who, id, text, file, dur}]}}
# Only new or changed lines are recorded (same id = same words, same voice settings: the file stays); lines no longer in the list go.
#   python3 tools/voices/record_lines.py
import asyncio, json, os, subprocess
import edge_tts
H = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(H, '..', '..'))
EX = os.path.join(ROOT, 'viz3', 'extra', 'saetze'); OUT = os.path.join(EX, 'dist', 'snd', 'voice', 'x'); TMP = os.path.join(ROOT, 'out', 'saetze')
os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
# the voice of each person: the first of the list that edge-tts offers; rate and pitch for age and character (Hubert and Ronald as in
# tools/voices/lines3.py, so their recorded lines sound the same)
WHO = {
    'hubert': (['de-DE-ConradNeural'], '-10%', '-8Hz', 'highpass=f=70,lowpass=f=9000'),
    'ronald': (['de-DE-FlorianMultilingualNeural'], '+2%', '-2Hz', 'highpass=f=80'),
    # edge-tts offers only three German men (Conrad and Florian are Hubert's and Ronald's): the multilingual voices (they speak German) and
    # the Austrian one make the villagers sound different from each other (26.10.2026; a light accent possible – Falko listens)
    'gerhard': (['en-US-AndrewMultilingualNeural', 'de-DE-KillianNeural'], '-10%', '-6Hz', 'highpass=f=70'),
    'manfred': (['de-DE-KillianNeural'], '-4%', '-6Hz', 'highpass=f=70'),
    'wolfgang': (['en-US-BrianMultilingualNeural', 'de-DE-KillianNeural'], '-6%', '-6Hz', 'highpass=f=70'),
    'uwe': (['de-AT-JonasNeural', 'de-DE-KillianNeural'], '+0%', '-2Hz', 'highpass=f=70'),
    'jens': (['de-DE-KillianNeural'], '+7%', '+3Hz', 'highpass=f=80'),
    'katrin': (['de-DE-KatjaNeural', 'de-DE-AmalaNeural'], '+2%', '+0Hz', 'highpass=f=90'),
    'ingrid': (['de-DE-ElkeNeural', 'de-DE-AmalaNeural', 'de-DE-SeraphinaMultilingualNeural'], '-4%', '-6Hz', 'highpass=f=90'),
    'heike': (['de-DE-TanjaNeural', 'de-DE-SeraphinaMultilingualNeural', 'de-DE-AmalaNeural'], '+0%', '-2Hz', 'highpass=f=90'),
}

async def voices():
    return {v['ShortName'] for v in await edge_tts.list_voices()}

async def say(text, voice, rate, pitch, raw):
    for k in range(4):
        try:
            await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(raw)
            if os.path.getsize(raw) > 1000: return True
        except Exception as e:
            print('retry', k, e, flush=True)
        await asyncio.sleep(4 + 4 * k)
    return False

def dur(f): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip() or 0)

lines = json.load(open(os.path.join(H, 'linien.json')))
have = asyncio.run(voices())
print('German and multilingual voices:', ' '.join(sorted(v for v in have if v.startswith('de-') or 'Multilingual' in v)), flush=True)
pick = {w: next((v for v in pref if v in have), None) for w, (pref, *_rest) in WHO.items()}
mf = os.path.join(EX, 'manifest.json')
old = json.load(open(mf))['vx'] if os.path.exists(mf) else {'voices': {}, 'lines': []}
done = {l['id']: l for l in old['lines'] if old['voices'].get(l['who']) == pick.get(l['who'])}
out, want, n = [], set(), 0
for l in lines:
    w = l['who']
    if not pick.get(w): print('no voice for', w); continue
    _p, rate, pitch, af = WHO[w]
    f = l['id'] + '.mp3'; mp3 = os.path.join(OUT, f); want.add(f)
    if l['id'] in done and os.path.exists(mp3):
        out.append(done[l['id']]); continue
    raw = os.path.join(TMP, f)
    if not asyncio.run(say(l['text'].replace('…', ','), pick[w], rate, pitch, raw)): print('FAILED', l['id']); continue
    # trim silence at both ends, gentle EQ, loudness, mono 24 kHz (as lines3.py)
    flt = f"silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12,areverse,{af},loudnorm=I=-17:TP=-1.5:LRA=9"
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', flt, '-ac', '1', '-ar', '24000', '-b:a', '48k', mp3], check=True)
    out.append({'who': w, 'id': l['id'], 'text': l['text'], 'file': 'voice/x/' + f, 'dur': round(dur(mp3), 2)}); n += 1
    print('ok', l['id'], out[-1]['dur'], flush=True)
for f in os.listdir(OUT):
    if f.endswith('.mp3') and f not in want: os.remove(os.path.join(OUT, f)); print('removed', f)
json.dump({'vx': {'voices': pick, 'lines': out}}, open(mf, 'w'), ensure_ascii=False, indent=1)
print('DONE', len(out), 'lines,', n, 'new', flush=True)
