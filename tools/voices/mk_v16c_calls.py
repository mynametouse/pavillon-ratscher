# V16c2: the player's warning call before the felling cut and before the band is cut – "Achtung, Baum fällt!" – for the man and the woman
# figure, Microsoft Edge neural voices (edge-tts, free, private use) through the session proxy, then a little louder and drier like a shout
# outdoors. Output: assets/snd/voice/call_m.mp3, call_f.mp3 + entries in voices.json (audio.voice('call_m', …) in world/fell.js).
import json, os, subprocess, sys
H = os.path.dirname(os.path.abspath(__file__)); SP = os.environ.get('PAV_WORK') or os.path.abspath(os.path.join(H, '..', '..'))
OUT = os.path.join(SP, 'assets', 'snd', 'voice'); TMP = os.path.join(SP, 'sndtest', 'calls'); os.makedirs(TMP, exist_ok=True)
ETTS = os.path.join(H, '..', 'assets', 'etts.py')
CALLS = {'call_m': ('spieler_m', 'de-DE-KillianNeural', '+6%', '+14Hz'), 'call_f': ('spieler_f', 'de-DE-KatjaNeural', '+6%', '+10Hz')}
TEXT = 'Achtung! Baum fällt!'
man = json.load(open(os.path.join(OUT, 'voices.json')))
for vid, (who, model, rate, pitch) in CALLS.items():
    raw = os.path.join(TMP, vid + '_raw.mp3'); subprocess.run([sys.executable, ETTS, model, rate, pitch, raw, TEXT], check=True)
    out = os.path.join(OUT, vid + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,highpass=f=120,acompressor=threshold=-20dB:ratio=4:attack=5:release=80,volume=3dB,aecho=0.8:0.25:60|130:0.18|0.1,alimiter=limit=0.95', '-ar', '48000', '-ac', '1', '-b:a', '96k', out], check=True)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip())
    man['voices'][who] = {'model': model, 'rate': rate, 'pitch': pitch, 'engine': 'Microsoft Edge Vorlesen (edge-tts)'}
    man['lines'] = [l for l in man['lines'] if l['id'] != vid] + [{'file': 'voice/' + vid + '.mp3', 'kind': 'call', 'who': who, 'id': vid, 'text': TEXT, 'dur': round(dur, 2)}]
    print(vid, round(dur, 2), 's')
json.dump(man, open(os.path.join(OUT, 'voices.json'), 'w'), ensure_ascii=False, indent=1)
