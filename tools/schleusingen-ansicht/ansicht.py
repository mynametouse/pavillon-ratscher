#!/usr/bin/env python3
"""feat/schleusingen-ansicht: the facade records → the looks per building that FASSADE (viz3/src/fassade/fassade.js, feat/gebaeude)
applies as the town is built – the data file fassade/ansicht.json of this extra: { "v": 1, "quelle": "…", "b": { "#<i>": look } } (key
'#i': a building of Schleusingen's town data, SCHL.bld[].i; format in docs/features/gebaeude.md, "Ansicht je Gebäude").

FASSADE loads gebaeude's own small look file (gebaeude/ansicht.json) first and this one over it key by key – a key here replaces that
look as a whole, so its fields (storeys, a flat roof …) are taken over here first and the street-view values laid over them.

The materials as FASSADE names them, with three choices of ours:
  klinker → 'putz' in the brick's colour (style 9 falls into the facade shader's barn branch and would be drawn as boards),
  verkleidung (light or coloured shingles) and schiefer → slate in the colour read off the view (schieferTon 3),
  *_og → the ground floor's colour (the upper floors are slate in its tone or half-timbering in its timber's tone).
art: the town's door and steps follow it (haus: a house's door and windows also where the town drew a hall); geschosse (storeys up to the
eave) and dach.form as read (FASSADE builds the storeys and 'flach'; walm and the side the ridge turns to the street, 'first', are data for
later).

  python3 tools/schleusingen-ansicht/ansicht.py [--out PATH]   (default: viz3/extra/schleusingen-ansicht/dist/fassade/ansicht.json)
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'viz3', 'extra', 'schleusingen-ansicht', 'dist', 'schleusingen-ansicht', 'fassaden.json')
OUT = os.path.join(ROOT, 'viz3', 'extra', 'schleusingen-ansicht', 'dist', 'fassade', 'ansicht.json')
BASE = os.path.join(ROOT, 'viz3', 'extra', 'gebaeude', 'dist', 'gebaeude', 'ansicht.json')   # gebaeude's own looks (may be missing)
HOLZ = {'braun': 0, 'rot': 1, 'schwarz': 2}            # fachwerkTon: dark brown, red-brown, black
TON = {'dunkel': 0, 'hell': 1, 'mittel': 2}            # schieferTon: blue-black, silver-grey, mid grey (3: the house's colour)
RAHMEN = {'weiss': 'weiss', 'braun': 'braun', 'gruen': 'gruen', 'grau': 'grau', 'blau': 'weiss'}
ART = {'haus': 'haus', 'block': 'haus', 'villa': 'haus', 'geschaeft': 'haus', 'gasthaus': 'haus', 'pavillon': 'haus',
       'halle': 'halle', 'autohaus': 'halle', 'garage': 'halle', 'schuppen': 'schuppen', 'scheune': 'scheune',
       'kirche': 'kirche', 'schule': 'schule'}


def look(r):
    """one record of fassaden.json → FASSADE's look"""
    m, art = r['material'], r['art']
    L = {'art': ART[art]}
    col = r['wand']
    if m in ('putz', 'klinker'):
        L['material'] = 'putz'
    elif m == 'stein':
        L['material'] = 'stein'
    elif m in ('putz_modern', 'glas'):
        L['material'] = 'glatt' if m == 'putz_modern' else 'glas'
        L['achse'] = 3.3
    elif m in ('schiefer', 'verkleidung'):
        L['material'] = 'schiefer'
        L['schieferTon'] = 3
    elif m == 'schiefer_og':
        L['material'] = 'schiefer-og'
        L['schieferTon'] = TON.get(r.get('schiefer'), 0)
        col = r['eg']['farbe']
    elif m == 'schiefer_giebel':
        L['material'] = 'schiefer-giebel'
        L['schieferTon'] = TON.get(r.get('schiefer'), 0)
    elif m == 'fachwerk':
        L['material'] = 'fachwerk'
    elif m == 'fachwerk_og':
        L['material'] = 'fachwerk-og'
        col = r['eg']['farbe']
    elif m == 'fachwerk_giebel':
        L['material'] = 'fachwerk-giebel'
    elif m == 'bretter':
        L['material'] = 'schuppen' if art == 'schuppen' else 'bretter'
        L['achse'] = 3.2
    elif m == 'blech':
        L['material'] = 'blech'
        L['achse'] = 4.5
    else:
        raise ValueError(f"building {r['i']}: material {m}")
    L['farbe'] = col
    if m.startswith('fachwerk') and r.get('fachwerk') in HOLZ:
        L['fachwerkTon'] = HOLZ[r['fachwerk']]
    fr = RAHMEN.get(r.get('rahmen'))
    if fr:
        L['rahmen'] = fr
    L['laeden'] = (r.get('rahmen') if r.get('rahmen') in ('gruen', 'braun', 'grau') else True) if r.get('laeden') else False
    d = r.get('dach') or {}
    if d.get('material'):
        L['dach'] = {'material': d['material'], 'farbe': d['farbe']}
        form = r.get('dachform') or ('flach' if d['material'] == 'flach' else None)
        if form:
            L['dach']['form'] = form   # FASSADE builds 'flach'; the other forms are data for later
    if r.get('geschosse'):
        L['geschosse'] = r['geschosse']
    if r.get('first'):
        L['first'] = r['first']        # gable ('giebel') or eave ('trauf') towards the street – data for later
    if art == 'schule':
        L.pop('achse', None)   # FASSADE: a school of our time (smooth, wide bays 3.6 m, light glass door, no shutters)
    return L


def build(doc, base=None):
    """all looks; base: gebaeude's own looks ({key: look}) – their fields stay where ours say nothing"""
    out = {}
    for r in doc['gebaeude']:
        k = f"#{r['i']}"
        L = look(r)
        b = dict((base or {}).get(k) or {})
        if b:
            d = dict(b.get('dach') or {}) if isinstance(b.get('dach'), dict) else {}
            d.update(L.get('dach') or {})
            b.update(L)
            if d:
                b['dach'] = d
            L = b
        out[k] = L
    return {'v': 1,
            'quelle': 'feat/schleusingen-ansicht: aus viz3/extra/schleusingen-ansicht/dist/schleusingen-ansicht/fassaden.json '
                      '(private Ansichten von der Straße, von Hand gelesen) – tools/schleusingen-ansicht/ansicht.py',
            'b': out}


def base_looks():
    try:
        return json.load(open(BASE)).get('b') or {}
    except (OSError, ValueError):
        return {}


if __name__ == '__main__':
    out = OUT
    if '--out' in sys.argv:
        out = sys.argv[sys.argv.index('--out') + 1]
    doc = json.load(open(SRC))
    a = build(doc, base_looks())
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w') as f:
        json.dump(a, f, ensure_ascii=False, indent=0)
        f.write('\n')
    from collections import Counter
    print(f"{len(a['b'])} looks → {os.path.relpath(out, ROOT)}", dict(Counter(L['material'] for L in a['b'].values())))
