# feat/zombie-werk: cut, level and encode the workbench and molotov recordings into viz3/extra/zombie-werk/dist/zombie/werk/ (+ werk.json).
#   python3 werkton.py DL OUT      DL: the downloads (OpenGameArt, sources and licences in CREDITS_TON.md beside this file):
#     saw_-_starninjas_0.ogg, 100-CC0-wood-metal-SFX.zip unpacked into wood/, knifesharpener1.flac, knifesharpener2.flac, glass_breaking.wav,
#     Bottle Break.wav (as Bottle_Break.wav), legit_audio_fire_staff_-_free_0.zip's Wavs/ into fire/ (spaces as _), ignition.flac
#   OUT: viz3/extra/zombie-werk/dist/zombie/werk
import json, os, re, subprocess, sys
DL = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)
# kind: [(source file, start s, end s, fade-out s)], vol (relative, in the game)
PICKS = {
    'saege': ([('saw_-_starninjas_0.ogg', 0.27, 1.08, 0.08), ('saw_-_starninjas_0.ogg', 1.92, 2.72, 0.08), ('saw_-_starninjas_0.ogg', 3.70, 4.48, 0.08)], 0.55),
    'hammer': ([('wood/wood_hammer_01.ogg', 0, 0.31, 0.06), ('wood/wood_hammer_02.ogg', 0, 0.23, 0.05)], 0.85),
    'metall': ([('wood/hammer_01.ogg', 0, 0.5, 0.12), ('wood/hammer_02.ogg', 0, 0.24, 0.06)], 0.6),
    'stein': ([('knifesharpener1.flac', 0, 0.42, 0.06), ('knifesharpener2.flac', 0, 0.55, 0.08)], 0.45),
    'glas': ([('glass_breaking.wav', 0.02, 1.28, 0.3), ('Bottle_Break.wav', 0.3, 1.36, 0.25)], 1.0),
    'feuer': ([('fire/LEGIT_FIR_Fire_Staff_1-Audio.wav', 0, 1.1, 0.25), ('fire/LEGIT_FIR_Fire_Staff_3-Audio.wav', 0.03, 0.9, 0.2), ('fire/LEGIT_FIR_Fire_Staff_8-Audio.wav', 0, 0.6, 0.15)], 1.0),
    'zuenden': ([('ignition.flac', 0, 0.75, 0.3)], 0.35),
}
def peak(path):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.search(r'max_volume: ([-0-9.]+) dB', o)
    return float(m.group(1)) if m else 0.0
out = {}
for kind, (parts, vol) in PICKS.items():
    files = []
    for i, (src, a, b, fo) in enumerate(parts):
        tmp = os.path.join(OUT, f'_{kind}_{i}.wav')
        af = f'atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.005,afade=t=out:st={max(0, b - a - fo):.3f}:d={fo}'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(DL, src), '-ac', '1', '-ar', '44100', '-af', af, tmp], check=True)
        g = -2.0 - peak(tmp)
        name = f'{kind}_{i + 1}.mp3'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', f'volume={g:.2f}dB', '-c:a', 'libmp3lame', '-b:a', '112k', os.path.join(OUT, name)], check=True)
        os.remove(tmp)
        files.append('werk/' + name)
        print(kind, name, src, a, b, f'{g:+.1f} dB', os.path.getsize(os.path.join(OUT, name)))
    out[kind] = {'files': files, 'vol': vol}
json.dump(out, open(os.path.join(OUT, '..', 'werk.json'), 'w'), indent=1)
