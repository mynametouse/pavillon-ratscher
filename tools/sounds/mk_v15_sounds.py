# V15b sounds: table saw (idle, cutting), thickness planer (idle, cutting), random-orbit sander – synthesized seamless 4 s loops (own work, CC0)
import numpy as np, subprocess, os, json
SR = 48000
SP = '/tmp/claude-0/-home-claude/c5ba8437-b351-5b29-96e3-f852e8e82b48/scratchpad'
OUT = SP + '/assets/snd'; TMP = SP + '/sndtest/v15'; os.makedirs(TMP, exist_ok=True)
rng = np.random.default_rng(15)
LN = 4 * SR; t = np.arange(LN) / SR
def save_mp3(x, name, kbps=112):
    x = np.asarray(x, np.float64); x = x - x.mean(); pk = np.max(np.abs(x)); x = x / max(pk, 1e-9) * 10 ** (-1.0 / 20)
    wav = TMP + '/' + name + '.f32'; x.astype(np.float32).tofile(wav)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', OUT + '/' + name + '.mp3'], check=True)
    return len(x)
def spec_filter(x, fn):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X * fn(f), len(x))
def bandnoise(lo, hi, tilt=0.0):
    X = (rng.standard_normal(LN // 2 + 1) + 1j * rng.standard_normal(LN // 2 + 1)); f = np.fft.rfftfreq(LN, 1 / SR)
    g = ((f >= lo) & (f <= hi)).astype(float); g = np.convolve(g, np.ones(41) / 41, 'same'); g *= np.where(f > 1, (f / 1000.0) ** tilt, 0)
    x = np.fft.irfft(X * g, LN); return x / (np.std(x) + 1e-12)
def bp(f, fc, q): return 1.0 / (1.0 + (q * (f / fc - fc / np.maximum(f, 1e-3))) ** 2)
# frequencies are rounded to whole cycles per 4 s loop so every partial loops seamlessly
def tone(f0, amp=1.0, fm=0.0, fmr=0.5):
    f0 = round(f0 * 4) / 4; fmr = round(fmr * 4) / 4; return amp * np.sin(2 * np.pi * f0 * t + fm * np.sin(2 * np.pi * fmr * t))
def slowmod(depth, rate):   # slow loop-periodic amplitude wobble
    rate = round(rate * 4) / 4; return 1 + depth * np.sin(2 * np.pi * rate * t + rng.uniform(0, 6.28))
info = {}
# ---- table saw: 2-pole induction motor 2800/min (46.7 Hz), 100 Hz hum, 250 mm blade with 48 teeth → tooth pass ~2240 Hz, blade whistle ----
mot = tone(46.75, 0.35) + tone(93.5, 0.22) + tone(100, 0.3) + tone(200, 0.12) + bandnoise(60, 400) * 0.18
whine = tone(2240, 0.16, 2.0, 0.5) + tone(4480, 0.05, 4.0, 0.5) + tone(1120, 0.05, 1.0, 0.5)
air = bandnoise(900, 7000, -0.25) * 0.42 * slowmod(0.08, 0.75)
ts_run = mot + whine + air
info['tablesaw_run_01.mp3'] = ('tablesaw_run', ts_run, 'Tischkreissäge im Leerlauf: Drehstrommotor 2800/min, Netzbrumm, Sägeblatt 250 mm/48 Zähne (Zahneingriff ~2,2 kHz), Luftrauschen; nahtlos.')
# cutting oak: speed drops a little, the teeth bite (broadband rasp modulated by the tooth pass), chips hiss
mot2 = tone(44.25, 0.42) + tone(88.5, 0.25) + tone(100, 0.3) + bandnoise(50, 500) * 0.3
rasp = bandnoise(400, 5200, -0.15) * (0.75 + 0.25 * np.sin(2 * np.pi * 2120 * t)) * slowmod(0.18, 1.75)
crk = np.zeros(LN); idx = rng.integers(0, LN, 1600); crk[idx] = rng.standard_normal(1600); crk = spec_filter(crk, lambda f: bp(f, 3000, 0.8)); crk /= (np.std(crk) + 1e-9)
ts_cut = mot2 + rasp * 0.75 + tone(2120, 0.12, 6.0, 0.75) + crk * 0.14 + bandnoise(5000, 11000) * 0.12
info['tablesaw_cut_01.mp3'] = ('tablesaw_cut', ts_cut, 'Tischkreissäge im Schnitt (Eiche): Drehzahl sinkt, Zahngeräusch, Späne; nahtlos.')
# ---- thickness planer: universal motor (whine ~ 360 Hz and harmonics, brush hiss), cutter block 10 000/min with 2 knives → 333 Hz ----
um = sum(tone(361.25 * k, 0.4 / k ** 0.9, 1.5, 0.5) for k in range(1, 9)) + bandnoise(3000, 12000, -0.1) * 0.22
cb = sum(tone(333.25 * k, 0.25 / k, 0.5, 0.25) for k in range(1, 6)) + bandnoise(200, 6000, -0.4) * 0.5 * slowmod(0.06, 0.5)
th_run = um + cb + tone(100, 0.15)
info['thick_run_01.mp3'] = ('thick_run', th_run, 'Dickenhobel im Leerlauf: Universalmotor (Heulen ~360 Hz, Bürstenrauschen), Messerwelle 10 000/min mit 2 Messern; nahtlos.')
um2 = sum(tone(318.25 * k, 0.45 / k ** 0.9, 2.5, 0.5) for k in range(1, 9)) + bandnoise(2500, 12000, -0.1) * 0.3
roar = bandnoise(150, 7000, -0.3) * (0.7 + 0.3 * np.sin(2 * np.pi * 293.25 * t)) * slowmod(0.15, 1.25)
chips = np.zeros(LN); idx = rng.integers(0, LN, 2400); chips[idx] = rng.standard_normal(2400); chips = spec_filter(chips, lambda f: bp(f, 2400, 0.7)); chips /= (np.std(chips) + 1e-9)
th_cut = um2 + roar * 0.95 + chips * 0.18 + tone(100, 0.15)
info['thick_cut_01.mp3'] = ('thick_cut', th_cut, 'Dickenhobel im Schnitt: Motor unter Last, Messerwelle 293 Hz, Spanauswurf; nahtlos.')
# ---- random-orbit sander: motor ~ 167 Hz, pad orbit, sanding hiss ----
ro = tone(166.75, 0.25, 1.0, 0.5) + tone(333.5, 0.12) + tone(500.25, 0.05) + bandnoise(1500, 9000, -0.15) * 0.55 * (0.85 + 0.15 * np.sin(2 * np.pi * 20.75 * t)) + bandnoise(80, 600) * 0.12
info['orbit_01.mp3'] = ('orbit', ro, 'Exzenterschleifer: Motor ~10 000/min, Schleifteller, Schleifrauschen; nahtlos.')
man = json.load(open(OUT + '/manifest.json')); names = set(info); man = [m for m in man if m['file'] not in names]
for f, (kind, x, notes) in info.items():
    n = save_mp3(x, f[:-4])
    man.append({'file': f, 'kind': kind, 'duration_s': round(n / SR, 3), 'peak_dbfs': -1.0, 'license': 'CC0', 'author': 'synthetisch (eigene Arbeit)', 'source_url': '', 'notes': notes, 'loop_samples': n})
    print(f, os.path.getsize(OUT + '/' + f) // 1024, 'KB')
json.dump(man, open(OUT + '/manifest.json', 'w'), indent=1, ensure_ascii=False)
