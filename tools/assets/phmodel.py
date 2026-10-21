# phmodel.py <id> [res=1k]: downloads a Poly Haven model (glTF + textures) into assets/_mdl_work/phnew/<id>/
import sys, os, json, subprocess
aid = sys.argv[1]; res = sys.argv[2] if len(sys.argv) > 2 else '1k'
W = '/tmp/claude-0/-home-claude/c5ba8437-b351-5b29-96e3-f852e8e82b48/scratchpad/assets/_mdl_work/phnew/' + aid; os.makedirs(W, exist_ok=True)
def curl(url, out):
    if os.path.exists(out) and os.path.getsize(out) > 100: return
    r = subprocess.run(['curl', '-sS', '-L', '--fail', '--retry', '3', '-o', out, url])
    if r.returncode: raise SystemExit('download failed ' + url)
fj = os.path.join(W, 'files.json'); curl('https://api.polyhaven.com/files/' + aid, fj); F = json.load(open(fj))
g = F['gltf'][res]['gltf']; curl(g['url'], os.path.join(W, os.path.basename(g['url'])))
for rel, e in g.get('include', {}).items():
    assert '..' not in rel and not rel.startswith('/'); p = os.path.join(W, rel); os.makedirs(os.path.dirname(p), exist_ok=True); curl(e['url'], p)
print(os.path.join(W, os.path.basename(g['url'])))
