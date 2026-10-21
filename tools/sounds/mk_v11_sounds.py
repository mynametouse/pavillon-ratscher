# V11 sounds: brook loop (field recording), generator loop (CC0), synthesized workshop machines (seamless 4 s loops built in the FFT domain).
import numpy as np, subprocess, os, json, sys
SR = 48000
SP = '/tmp/claude-0/-home-claude/c5ba8437-b351-5b29-96e3-f852e8e82b48/scratchpad'
OUT = SP + '/assets/snd'; TMP = SP + '/sndtest/v11'; os.makedirs(TMP, exist_ok=True)
rng = np.random.default_rng(7)
def load(path, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)
def save_mp3(x, name, kbps=112):
    x = np.asarray(x, np.float64); pk = np.max(np.abs(x)); x = x / max(pk, 1e-9) * 10 ** (-1.0 / 20)
    wav = TMP + '/' + name + '.f32'; x.astype(np.float32).tofile(wav)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', OUT + '/' + name + '.mp3'], check=True)
    return len(x)
def spec_filter(x, fn):   # circular filter in the frequency domain (keeps a loop seamless)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X * fn(f), len(x))
def bandnoise(n, lo, hi, tilt=0.0):
    X = (rng.standard_normal(n // 2 + 1) + 1j * rng.standard_normal(n // 2 + 1)); f = np.fft.rfftfreq(n, 1 / SR)
    g = ((f >= lo) & (f <= hi)).astype(float); g = np.convolve(g, np.ones(41) / 41, 'same'); g *= np.where(f > 1, (f / 1000.0) ** tilt, 0)
    x = np.fft.irfft(X * g, n); return x / (np.std(x) + 1e-12)
def bp(f, fc, q): return 1.0 / (1.0 + (q * (f / fc - fc / np.maximum(f, 1e-3))) ** 2)
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
info = {}
# ---------- brook: Reinhardswald, Bach (blackhole-factory, radio aporee, CC BY-SA 3.0): 10–34 s, high-pass, 2 s crossfade loop ----------
src = load(SP + '/snddl/brook/aporee_7654_9402.mp3')
seg = src[int(10 * SR):int(36 * SR)]
seg = spec_filter(seg, lambda f: np.clip((f - 90) / 60, 0, 1) * (1 / (1 + (f / 11000) ** 4)))
L = int(24 * SR); xf = int(2 * SR); a = seg[:L].copy(); tail = seg[L:L + xf]
w = np.sin(np.linspace(0, np.pi / 2, xf)) ** 2; a[:xf] = a[:xf] * w + tail * (1 - w)   # end of the take fades into the start → seamless
a *= 10 ** ((-20 - rms_db(a)) / 20)
info['stream_01.mp3'] = {'kind': 'stream_loop', 'loop_samples': save_mp3(a, 'stream_01', 128), 'license': 'CC BY-SA 3.0', 'author': 'blackhole-factory (radio aporee ::: maps)',
  'source_url': 'https://archive.org/details/aporee_7654_9402', 'notes': 'Reinhardswald, Bach (2010). Ausschnitt 10–34 s, Hochpass 90 Hz, Tiefpass 11 kHz, 2 s Überblendung für eine nahtlose Schleife, normalisiert.'}
# ---------- generator: "Generator loop" (ycbcr, OpenGameArt, CC0), mono, looped twice with crossfade ----------
g0 = load(SP + '/snddl/loop_generator_1.mp3'); n = len(g0) // 2 * 2
gx = int(0.25 * SR); body = g0[:n - gx].copy(); w = np.sin(np.linspace(0, np.pi / 2, gx)) ** 2; body[:gx] = body[:gx] * w + g0[n - gx:n] * (1 - w)
body = spec_filter(body, lambda f: np.clip((f - 35) / 25, 0, 1)); body *= 10 ** ((-17 - rms_db(body)) / 20)
info['generator_01.mp3'] = {'kind': 'generator', 'loop_samples': save_mp3(body, 'generator_01', 112), 'license': 'CC0', 'author': 'ycbcr (OpenGameArt)', 'source_url': 'https://opengameart.org/content/generator-loop', 'notes': 'Generatorschleife, mono 48 kHz, Hochpass 35 Hz, Anfang/Ende überblendet.'}
# ---------- synthesized machines (own work, CC0) ----------
LN = 4 * SR; t = np.arange(LN) / SR
def engine(fire=25.0, load=0.0):
    n_p = int(round(fire * 4)); per = LN / n_p; imp = np.zeros(LN)
    for k in range(n_p): imp[int(k * per + rng.uniform(-0.0004, 0.0004) * SR) % LN] += 0.8 + 0.4 * rng.random()
    kl = int(0.05 * SR); ker = np.zeros(LN); ker[:kl] = rng.standard_normal(kl) * np.exp(-np.arange(kl) / (0.006 * SR)) + 2.5 * np.exp(-np.arange(kl) / (0.012 * SR)) * np.sin(2 * np.pi * 70 * np.arange(kl) / SR)
    x = np.fft.irfft(np.fft.rfft(imp) * np.fft.rfft(ker), LN)
    x = spec_filter(x, lambda f: (bp(f, 95, 1.4) * 1.6 + bp(f, 380, 1.8) * 0.8 + bp(f, 1400, 1.2) * 0.25 * (1 + load)) * np.clip(f / 30, 0, 1))
    return x / np.std(x)
def tone(f0, amp=1.0, fm=0.0, fmr=0.5): return amp * np.sin(2 * np.pi * f0 * t + fm * np.sin(2 * np.pi * fmr * t))
# band sawmill idling: engine + blade whine and hiss
e = engine(25.0); blade = bandnoise(LN, 1500, 4200) * 0.22 + tone(1250, 0.10, 3.0, 0.5) + tone(2500, 0.04, 6.0, 0.5) + bandnoise(LN, 6000, 11000) * 0.05
saw_run = e * 0.62 + blade
info['saw_run_01.mp3'] = {'kind': 'saw_run', 'loop_samples': save_mp3(saw_run, 'saw_run_01'), 'license': 'CC0', 'author': 'synthetisch (eigene Arbeit)', 'source_url': '', 'notes': 'Blockbandsäge im Leerlauf: Einzylinder-Benzinmotor (25 Zündungen/s) und Sägeband, im Frequenzraum erzeugt, nahtlos.'}
# cutting: engine under load, rasp of the teeth in the wood, crackle of fibres
e2 = engine(22.5, load=1.0); rasp = bandnoise(LN, 350, 2600, -0.3) * (0.75 + 0.25 * np.sin(2 * np.pi * 3.25 * t) ** 2)
crk = np.zeros(LN); idx = rng.integers(0, LN, 900); crk[idx] = rng.standard_normal(900); crk = spec_filter(crk, lambda f: bp(f, 2200, 0.9)) * 6
saw_cut = e2 * 0.75 + rasp * 0.55 + crk / (np.std(crk) + 1e-9) * 0.12 + tone(1150, 0.07, 4.0, 0.75) + bandnoise(LN, 5000, 10000) * 0.06
info['saw_cut_01.mp3'] = {'kind': 'saw_cut', 'loop_samples': save_mp3(saw_cut, 'saw_cut_01'), 'license': 'CC0', 'author': 'synthetisch (eigene Arbeit)', 'source_url': '', 'notes': 'Blockbandsäge im Schnitt: Motor unter Last, Zahngeräusch und Faserknistern, nahtlos.'}
# planer: two-knife cutter block at 6000 rpm → 200 Hz with harmonics, air noise, 100 Hz hum
pl = sum(tone(200 * k, 0.5 / k ** 1.1, 0.6, 0.25) for k in range(1, 14)) + bandnoise(LN, 300, 9000, -0.35) * 0.55 + tone(100, 0.25) + bandnoise(LN, 2500, 6000) * 0.12
info['planer_01.mp3'] = {'kind': 'planer', 'loop_samples': save_mp3(pl, 'planer_01'), 'license': 'CC0', 'author': 'synthetisch (eigene Arbeit)', 'source_url': '', 'notes': 'Abricht-Dickenhobel läuft: Messerwelle 6000/min (200 Hz und Obertöne), Luftrauschen, Netzbrumm.'}
# drum sander: motor hum, drum at 28.25 Hz, sanding hiss with drum modulation, conveyor whine
hiss = bandnoise(LN, 900, 9000, -0.2) * (0.8 + 0.2 * np.sin(2 * np.pi * 28.25 * t))
sd = tone(100, 0.28) + tone(200, 0.1) + bandnoise(LN, 40, 260) * 0.35 + hiss * 0.6 + tone(620, 0.03, 2.0, 0.5)
info['sander_01.mp3'] = {'kind': 'sander', 'loop_samples': save_mp3(sd, 'sander_01'), 'license': 'CC0', 'author': 'synthetisch (eigene Arbeit)', 'source_url': '', 'notes': 'Trommelschleifer: Motorbrumm, Schleiftrommel 1700/min, Schleifrauschen, Vorschubband.'}
# ---------- manifest ----------
man = json.load(open(OUT + '/manifest.json')); man = [m for m in man if m['file'] not in info]
for f, v in info.items(): man.append({'file': f, 'kind': v['kind'], 'duration_s': round(v['loop_samples'] / SR, 3), 'peak_dbfs': -1.0, 'license': v['license'], 'author': v['author'], 'source_url': v['source_url'], 'notes': v['notes'], 'loop_samples': v['loop_samples']})
json.dump(man, open(OUT + '/manifest.json', 'w'), indent=1, ensure_ascii=False)
for f in info: print(f, os.path.getsize(OUT + '/' + f) // 1024, 'KB')
