# Everyone in the village says du to the player (Falko, 25.10.2026): Hubert's recorded lines that said Sie, spoken anew with the same
# Microsoft Edge neural voice and the same sound as tools/voices/lines3.py (edge-tts, free, private use). Runs on GitHub Actions
# (.github/workflows/stimmen.yml: the chat machine cannot reach the speech service) and writes a feature extra:
#   viz3/extra/stimmen/dist/snd/voice/du/<id>.mp3   the recordings (copied into dist/ by build.py)
#   viz3/extra/stimmen/manifest.json                 {"vm_replace": [line, …], "vm": {"topics": …}} – build.py puts the lines in place of the old ones
#   python3 tools/voices/du_lines.py
import asyncio, json, os, subprocess
import edge_tts
H = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(H, '..', '..'))
EX = os.path.join(ROOT, 'viz3', 'extra', 'stimmen'); OUT = os.path.join(EX, 'dist', 'snd', 'voice', 'du'); TMP = os.path.join(ROOT, 'out', 'stimmen')
os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
VOICE = dict(voice='de-DE-ConradNeural', rate='-10%', pitch='-8Hz', af='highpass=f=70,lowpass=f=9000')   # Hubert, as in lines3.py
LINES = {
    'hubert_near_01': 'Bleib mal da drüben.',
    'hubert_greet_01': 'Was willst du?',
    'hubert_greet_02': 'Ja? Mach es kurz.',
    'hubert_greetf_01': 'Ach, du bist es. Na?',
    'hubert_t_garten': 'Dein Garten? Lag lange genug brach. Mäh wenigstens regelmäßig, sonst hab ich die Samen bei mir.',
    'hubert_t_wer': 'Hubert. Mehr musst du nicht wissen. Und jetzt lass mich arbeiten.',
    'hubert_t_q_hilfe': 'Hilfe? Ich brauch keine Hilfe. Na gut. Der Traktor ist leer, und mit meinem Rücken schlepp ich keinen Kanister. Du hast doch Diesel hinten an deinem Aggregat. Bring mir den Kanister. Dann sehen wir weiter.',
    'hubert_t_q_kanister': 'Der Kanister steht hinten bei deiner Werkstatt, neben dem Aggregat. Ich warte hier nicht ewig.',
    'hubert_t_q_voll': 'Na also. Geht doch. Dann steig auf, links auf den Kotflügel. Festhalten und nichts anfassen.',
    'hubert_t_q_auf': 'Was stehst du da noch rum? Aufsteigen.',
    'hubert_t_q_fahrt': 'Schon gut. Wenn du mal Holz brauchst, weißt du ja, wo ich wohne.',
    'hubert_t_q_brett': 'Stirnholz. Hm. Saubere Fugen. Das hast du selbst gemacht? Nicht schlecht.',
    'hubert_t_q_frieda': 'Die braune Ziege? Die steht in meinem Kohl! Hol die da raus, aber schnell.',
    'hubert_frieda': 'Ist das Ronalds Ziege? Die frisst meinen Kohl! Schaff das Vieh hier weg!',
    'hubert_frieda2': 'Und sag Ronald, er soll sein Gatter zumachen!',
    'hubert_ride_end': 'Absteigen. Und danke. Aber sag es keinem.',
}
TOPICS = {'hubert': {'garten': 'Dein Garten', 'wer': 'Wer bist du?'}}   # the player's buttons: du as well

async def say(text, raw):
    for k in range(4):
        try:
            await edge_tts.Communicate(text, VOICE['voice'], rate=VOICE['rate'], pitch=VOICE['pitch']).save(raw)
            if os.path.getsize(raw) > 1000: return
        except Exception as e:
            print('retry', k, e, flush=True)
        await asyncio.sleep(4 + 4 * k)
    raise SystemExit('FAILED ' + text)

def dur(f): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip() or 0)

lines = []
mf = os.path.join(EX, 'manifest.json')
old = {l['id']: l for l in json.load(open(mf))['vm_replace']} if os.path.exists(mf) else {}
for id_, text in LINES.items():
    raw = os.path.join(TMP, id_ + '.mp3'); mp3 = os.path.join(OUT, id_ + '.mp3')
    if id_ in old and old[id_]['text'] == text and os.path.exists(mp3):   # recorded already with these words: keep
        lines.append(old[id_]); continue
    asyncio.run(say(text.replace('…', ','), raw))
    # trim silence at both ends, gentle EQ, loudness, mono 24 kHz (as lines3.py)
    af = f"silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12,areverse,{VOICE['af']},loudnorm=I=-17:TP=-1.5:LRA=9"
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ac', '1', '-ar', '24000', '-b:a', '56k', mp3], check=True)
    lines.append({'file': 'voice/du/' + id_ + '.mp3', 'who': 'hubert', 'id': id_, 'text': text, 'dur': round(dur(mp3), 2)})
    print('ok', id_, lines[-1]['dur'], flush=True)
json.dump({'vm_replace': lines, 'vm': {'topics': TOPICS}}, open(os.path.join(EX, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
print('DONE', len(lines))
