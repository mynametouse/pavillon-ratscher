# records for the record player: public-domain recordings (Wikimedia Commons) → MP3 with a little vinyl character (crackle, soft top end)
import json, os, subprocess, glob, numpy as np, wave, sys
HERE = os.path.dirname(os.path.abspath(__file__)); RAW = os.path.join(HERE, 'raw'); OUT = os.path.join(os.path.dirname(HERE), 'assets', 'snd', 'music'); os.makedirs(OUT, exist_ok=True)
meta = json.load(open(os.path.join(RAW, 'meta.json')))
INFO = {'gymnopedie': ('Gymnopédie Nr. 1', 'Erik Satie, gespielt von Robin Alciatore (Musopen)'),
        'gnossienne': ('Gnossienne Nr. 1', 'Erik Satie, gespielt von „La Pianista“'),
        'mapleleaf': ('Maple Leaf Rag', 'Scott Joplin, Klavierrolle von 1916'),
        'nocturne': ('Nocturne Es-Dur op. 9 Nr. 2', 'Frédéric Chopin, gespielt von Frank Lévy (Musopen)')}
rng = np.random.default_rng(7); out = []
for k in ['gymnopedie', 'gnossienne', 'mapleleaf', 'nocturne']:
    src = [f for f in glob.glob(os.path.join(RAW, k + '*')) if os.path.getsize(f) > 100000]
    if not src: print('missing', k); continue
    wav = os.path.join(HERE, k + '.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src[0], '-ac', '2', '-ar', '44100', '-af', 'loudnorm=I=-20:TP=-2:LRA=11', wav], check=True)
    w = wave.open(wav); n = w.getnframes(); a = np.frombuffer(w.readframes(n), '<i2').reshape(-1, 2).astype(np.float32) / 32768; w.close()
    # crackle: sparse clicks of random size, a faint hiss, a slow wow-like level wobble
    cr = np.zeros(len(a), np.float32); idx = rng.random(len(a)) < 12 / 44100; cr[idx] = rng.normal(0, 1, idx.sum()) * rng.choice([0.012, 0.03, 0.07], idx.sum(), p=[0.7, 0.25, 0.05])
    cr = np.convolve(cr, np.exp(-np.arange(24) / 4.0), 'same'); hiss = rng.normal(0, 0.0012, len(a)).astype(np.float32)
    t = np.arange(len(a)) / 44100; wob = 1 + 0.004 * np.sin(2 * np.pi * 0.55 * t)
    y = a * wob[:, None] + (cr + hiss)[:, None] * 0.8
    y = np.clip(y, -1, 1); tmp = os.path.join(HERE, k + '_v.wav')
    with wave.open(tmp, 'wb') as o: o.setnchannels(2); o.setsampwidth(2); o.setframerate(44100); o.writeframes((y * 32767).astype('<i2').tobytes())
    mp3 = os.path.join(OUT, k + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', 'lowpass=f=12500,highpass=f=40', '-codec:a', 'libmp3lame', '-q:a', '6', mp3], check=True)
    os.remove(wav); os.remove(tmp)
    m = meta[k]; title, by = INFO[k]
    out.append({'file': k + '.mp3', 'title': title, 'by': by, 'lic': 'gemeinfrei (Public Domain)', 'src': m['page'], 'dur': round(len(a) / 44100, 1)})
    print(k, os.path.getsize(mp3), round(len(a) / 44100))
json.dump(out, open(os.path.join(OUT, 'music.json'), 'w'), ensure_ascii=False, indent=1)
