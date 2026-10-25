# V14 dialogue (du since 25.10.2026, Falko: everyone in the village says du; the new recordings of those lines: du_lines.py): all lines of Hubert and Ronald, spoken by Microsoft Edge neural voices (edge-tts; free, private use)
# Output: assets/snd/voice/<id>.mp3 + voices.json (same format as before; old Piper files are replaced)
import json, os, subprocess, sys, time, re
H = os.path.dirname(os.path.abspath(__file__)); SP = os.path.dirname(H)
OUT = os.path.join(SP, 'assets', 'snd', 'voice'); TMP = os.path.join(H, 'raw'); os.makedirs(TMP, exist_ok=True)
ETTS = os.path.join(SP, 'scripts', 'etts.py')
VOICES = {'hubert': dict(voice='de-DE-ConradNeural', rate='-10%', pitch='-8Hz', af='highpass=f=70,lowpass=f=9000'),
          'ronald': dict(voice='de-DE-FlorianMultilingualNeural', rate='+2%', pitch='-2Hz', af='highpass=f=80')}
L = {
 'hubert': {
  'idle': ['Hm.', 'Was gibt es da zu gucken?', 'Hab zu tun.', 'Hier wächst auch nichts von allein.', 'Der Zaun bleibt, wo er ist.', 'Wird wieder Regen geben.'],
  'near': ['Bleib mal da drüben.', 'Nicht so nah. Ich hab Werkzeug in der Hand.'],
  'greet': ['Was willst du?', 'Ja? Mach es kurz.'],
  'greetf': ['Ach, du bist es. Na?', 'Na, Nachbar. Alles im Lot?'],
  'bye': ['Ich muss weiter.', 'Genug geredet.', 'So. Das war es.'],
  't': {
   'garten': 'Dein Garten? Lag lange genug brach. Mäh wenigstens regelmäßig, sonst hab ich die Samen bei mir.',
   'pavillon': 'Ein Häuschen mit Dachterrasse, so so. Solange mir der Schatten nicht aufs Beet fällt. Und kein Lärm nach zehn.',
   'wetter': 'Wetter? Kommt Regen. Sagt mein Knie. Das Knie irrt sich nie.',
   'holz': 'Lärche aus dem eigenen Wald. Luftgetrocknet, zwei Jahre mindestens, sonst reißt es. Mehr sag ich nicht.',
   'traktor': 'Der Traktor? Baujahr zweiundsechzig. Läuft. Mehr muss er nicht. Und nein, ich verleihe ihn nicht.',
   'wer': 'Hubert. Mehr musst du nicht wissen. Und jetzt lass mich arbeiten.',
   'q_hilfe': 'Hilfe? Ich brauch keine Hilfe. Na gut. Der Traktor ist leer, und mit meinem Rücken schlepp ich keinen Kanister. Du hast doch Diesel hinten an deinem Aggregat. Bring mir den Kanister. Dann sehen wir weiter.',
   'q_kanister': 'Der Kanister steht hinten bei deiner Werkstatt, neben dem Aggregat. Ich warte hier nicht ewig.',
   'q_voll': 'Na also. Geht doch. Dann steig auf, links auf den Kotflügel. Festhalten und nichts anfassen.',
   'q_auf': 'Was stehst du da noch rum? Aufsteigen.',
   'q_fahrt': 'Schon gut. Wenn du mal Holz brauchst, weißt du ja, wo ich wohne.',
   'q_brett': 'Stirnholz. Hm. Saubere Fugen. Das hast du selbst gemacht? Nicht schlecht.',
   'q_frieda': 'Die braune Ziege? Die steht in meinem Kohl! Hol die da raus, aber schnell.',
  },
  'x': {
   'frieda': 'Ist das Ronalds Ziege? Die frisst meinen Kohl! Schaff das Vieh hier weg!',
   'frieda2': 'Und sag Ronald, er soll sein Gatter zumachen!',
   'bench': 'Das ist meine Bank.',
   'touch': 'Finger weg von meinem Traktor.',
   'fill': 'Langsam. Nicht danebenkippen.',
   'ride_1': 'Festhalten.',
   'ride_2': 'Das da drüben ist mein Acker. Kartoffeln. Seit fünfzig Jahren.',
   'ride_3': 'Früher war das hier alles LPG. Jetzt mach ich das allein.',
   'ride_4': 'So. Und wieder zurück.',
   'ride_end': 'Absteigen. Und danke. Aber sag es keinem.',
  } },
 'ronald': {
  'idle': ['Na, Ziegen, satt?', 'Schönes Wetter heute, was?', 'Komm, Lotte, komm her.', 'Tag auch!', 'Egon, lass das Gatter in Ruhe.'],
  'schnauze': ['Schnauze!', 'Schnauze, Egon!', 'Ruhe im Stall! Ha ha.'],
  'greet': ['Na, hallo Nachbar! Alles gut bei euch?', 'Ah, Besuch vom Nachbargarten. Komm ran, die beißen nicht.'],
  'greetf': ['Na, mein Lieblingsnachbar! Was gibt es?'],
  'bye': ['Mach es gut! Und grüß die Ziegen nicht, die sind eingebildet.', 'Bis dann, Nachbar. Komm mal rüber, wenn der Pavillon steht.'],
  't': {
   'ziegen': 'Das sind Lotte, Frieda und der Bock Egon. Die meckern, wenn sie Hunger haben. Und wenn sie keinen haben, auch.',
   'pavillon': 'Euer Pavillon mit Dachterrasse? Da komm ich mal rauf zum Sonnenuntergang. Ich bring Bier mit.',
   'wetter': 'Morgen soll es schön werden. Hubert drüben sagt Regen. Aber der sagt immer Regen.',
   'dorf': 'Ratscher ist klein, aber hier kennt jeder jeden. Freitags ist Stammtisch im Gasthof. Komm vorbei.',
   'hilfe': 'Wenn ihr beim Aufrichten der Wände Hände braucht, sag Bescheid. Mein Traktor hat auch einen Frontlader.',
   'hubert': 'Der Hubert? Der ist in Ordnung, nur eigen. Lass ihn in Ruhe, dann lässt er dich in Ruhe.',
   'q_helfen': 'Helfen? Immer gern! Die Ziegen haben Hunger. Hinten im Unterstand liegt Heu. Nimm dir einen Arm voll und gib jeder was ab. Aber Egon zuerst, sonst ist er beleidigt.',
   'q_heu': 'Das Heu liegt hinten im Unterstand. Und dann ab zu den Ziegen. Lotte, Frieda und Egon.',
   'q_wo': 'Frieda ist bestimmt wieder bei Hubert im Gemüse. Die liebt seinen Kohl. Hör einfach auf das Meckern.',
   'q_frieda': 'Du bist ein Schatz! Ich mach das Gatter jetzt zu, versprochen. Hier, nimm ein Stück Ziegenkäse mit. Selbstgemacht!',
   'q_werkstatt': 'Sag mal, in deiner Werkstatt, da machst du doch diese Stirnholzbretter. Klingenholz, oder? Machst du mir eins? Für die Küche. Ich lad dich dafür zum Grillen ein.',
   'q_wie': 'Na, du bist doch der Fachmann! Leimholz in Kanteln sägen, verleimen, hobeln, in Scheiben schneiden, drehen, wieder verleimen, schleifen, ölen. Hast du mir selbst erzählt. Und setz die Schutzbrille auf!',
   'q_brett': 'Wahnsinn, ist das schön! Das ist viel zu schade für Zwiebeln. Das hänge ich an die Wand. Danke, Nachbar! Samstag wird gegrillt.',
  },
  'x': {
   'hay': 'Genau, das ist das gute Heu.',
   'egon': 'Siehste, jetzt ist Egon beleidigt. Na ja, der kriegt sich wieder ein.',
   'fed_open': 'Danke dir! Ach du Schreck, Frieda haut ab! Das Gatter steht ja noch offen! Hinterher, sonst frisst sie wieder Huberts Kohl!',
   'fed_jump': 'Danke dir! Ach du Schreck, Frieda! Die springt glatt übers Gatter! Hinterher, sonst frisst sie wieder Huberts Kohl!',
   'back': 'Da ist sie ja! Frieda, du Ausreißerin!',
   'pet': 'Die mögen dich!',
  } } }
def items():
    for who, d in L.items():
        for cat in ('idle', 'near', 'greet', 'greetf', 'bye', 'schnauze'):
            for i, t in enumerate(d.get(cat, [])): yield who, f'{who}_{cat}_{i + 1:02d}', t
        for k, t in d['t'].items(): yield who, f'{who}_t_{k}', t
        for k, t in d['x'].items(): yield who, f'{who}_{k}', t
def dur(f): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip() or 0)
man = []; want = set()
for who, id_, text in items():
    v = VOICES[who]; raw = os.path.join(TMP, id_ + '.mp3'); mp3 = os.path.join(OUT, id_ + '.mp3'); want.add(id_ + '.mp3')
    spoken = text.replace('…', ',')
    key = json.dumps([v, spoken]); kf = raw + '.key'
    if not (os.path.exists(raw) and os.path.exists(kf) and open(kf).read() == key):
        for k in range(4):
            r = subprocess.run([sys.executable, ETTS, v['voice'], v['rate'], v['pitch'], raw, spoken], capture_output=True, text=True)
            if r.returncode == 0 and os.path.exists(raw) and os.path.getsize(raw) > 1000: break
            print('retry', id_, r.stderr[-300:], flush=True); time.sleep(4 + 4 * k)
        else: print('FAILED', id_, flush=True); continue
        open(kf, 'w').write(key); time.sleep(0.4)
    # trim silence at both ends, gentle EQ, loudness, mono 24 kHz
    af = f"silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12,areverse,{v['af']},loudnorm=I=-17:TP=-1.5:LRA=9"
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ac', '1', '-ar', '24000', '-b:a', '56k', mp3], check=True)
    man.append({'file': 'voice/' + id_ + '.mp3', 'kind': None, 'who': who, 'id': id_, 'text': text, 'dur': round(dur(mp3), 2)})
    print('ok', id_, man[-1]['dur'], flush=True)
for f in os.listdir(OUT):
    if f.endswith('.mp3') and f not in want: os.remove(os.path.join(OUT, f)); print('removed', f)
topics = {'hubert': {'garten': 'Dein Garten', 'pavillon': 'Der Pavillon', 'wetter': 'Wetter', 'holz': 'Holz', 'traktor': 'Der Traktor', 'wer': 'Wer bist du?'},
          'ronald': {'ziegen': 'Die Ziegen', 'pavillon': 'Der Pavillon', 'wetter': 'Wetter', 'dorf': 'Ratscher', 'hilfe': 'Hilfe beim Bau', 'hubert': 'Hubert'}}
json.dump({'voices': {k: {'model': v['voice'], 'rate': v['rate'], 'pitch': v['pitch'], 'engine': 'Microsoft Edge Vorlesen (edge-tts)'} for k, v in VOICES.items()}, 'lines': man, 'topics': topics}, open(os.path.join(OUT, 'voices.json'), 'w'), ensure_ascii=False, indent=1)
print('DONE', len(man))
