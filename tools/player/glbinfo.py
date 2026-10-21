import sys, json, struct
def info(p):
    b = open(p, 'rb').read()
    if b[:4] == b'glTF':
        L = struct.unpack('<I', b[12:16])[0]; js = json.loads(b[20:20 + L])
    else: js = json.load(open(p))
    anims = js.get('animations', [])
    nodes = js.get('nodes', [])
    skins = js.get('skins', [])
    print(p.split('/')[-1], 'nodes', len(nodes), 'meshes', len(js.get('meshes', [])), 'skins', len(skins), 'anims', len(anims), 'materials', [m.get('name') for m in js.get('materials', [])][:12])
    if skins: print(' joints', len(skins[0]['joints']), [nodes[j].get('name') for j in skins[0]['joints']][:70])
    print(' anim names:', ', '.join(a.get('name', '?') for a in anims))
for p in sys.argv[1:]: info(p)
