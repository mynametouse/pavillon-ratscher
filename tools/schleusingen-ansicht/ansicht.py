#!/usr/bin/env python3
"""feat/schleusingen-ansicht: the facade records → the looks per building that FASSADE (viz3/src/fassade/fassade.js, feat/gebaeude) applies
as the town is built – the data file fassade/ansicht.json of an extra: { "v": 1, "quelle": "…", "b": { "#<i>": look } } (key '#i': a
building of Schleusingen's town data, SCHL.bld[].i).

The look holds what FASSADE reads (farbe, material, fachwerk = timber colour 0–2, laeden, rahmen, achse, dach.farbe, art 'schule') and
two fields it does not read yet: 'schieferton' (hell, mittel, dunkel – the slate's tone; the town draws all slate blue-black) and
'dach.material' (the roof's kind; the town keeps its own). The materials follow SALOOK (viz3/src/schleusingen-ansicht/sa_look.js):
  klinker → plaster in the brick's colour (style 9 falls into the facade shader's barn branch and would be drawn as boards),
  verkleidung (light or coloured shingles) → plaster in their colour (slate is drawn blue-black),
  *_og → the ground floor's colour (the upper floors are slate or half-timbering), fachwerk_giebel and stein → plaster.

  python3 tools/schleusingen-ansicht/ansicht.py [--out PATH]   (default: viz3/extra/schleusingen-ansicht/dist/fassade/ansicht.json)
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'viz3', 'extra', 'schleusingen-ansicht', 'dist', 'schleusingen-ansicht', 'fassaden.json')
OUT = os.path.join(ROOT, 'viz3', 'extra', 'schleusingen-ansicht', 'dist', 'fassade', 'ansicht.json')
TIMBER = {'braun': 0, 'rot': 1, 'schwarz': 2}
RAHMEN = {'weiss': 'weiss', 'braun': 'braun', 'gruen': 'gruen', 'grau': 'grau', 'blau': 'weiss'}


def look(r):
    """one record of fassaden.json → FASSADE's look"""
    m, art = r['material'], r['art']
    L = {}
    col = r['wand']
    if m in ('putz', 'stein', 'fachwerk_giebel', 'klinker', 'verkleidung'):
        L['material'] = 'putz'
    elif m in ('putz_modern', 'glas'):
        L['material'] = 'glatt'
        L['achse'] = 3.3
    elif m == 'schiefer':
        L['material'] = 'schiefer'
    elif m == 'schiefer_og':
        L['material'] = 'schiefer-og'
        col = r['eg']['farbe']
    elif m == 'schiefer_giebel':
        L['material'] = 'schiefer-giebel'
    elif m == 'fachwerk':
        L['material'] = 'fachwerk'
    elif m == 'fachwerk_og':
        L['material'] = 'fachwerk-og'
        col = r['eg']['farbe']
    elif m == 'bretter':
        L['material'] = 'holz' if art == 'scheune' else 'schuppen'
        L['achse'] = 3.2 if art != 'scheune' else 3.0
    elif m == 'blech':
        L['material'] = 'halle'
        L['achse'] = 4.5
    else:
        raise ValueError(f"building {r['i']}: material {m}")
    L['farbe'] = col
    if m in ('fachwerk', 'fachwerk_og') and r.get('fachwerk') in TIMBER:
        L['fachwerk'] = TIMBER[r['fachwerk']]
    if m.startswith('schiefer') and r.get('schiefer'):
        L['schieferton'] = r['schiefer']
    fr = RAHMEN.get(r.get('rahmen'))
    if fr:
        L['rahmen'] = fr
    if r.get('laeden'):
        L['laeden'] = r.get('rahmen') if r.get('rahmen') in ('gruen', 'braun', 'grau') else True
    else:
        L['laeden'] = False
    d = r.get('dach') or {}
    if d.get('farbe'):
        L['dach'] = {'farbe': d['farbe'], 'material': d.get('material')}
    if art == 'schule':
        L['art'] = 'schule'   # FASSADE: a school of our time (smooth, wide bays 3.6 m, light glass door, no shutters)
        L.pop('achse', None)
    return L


def build(doc):
    return {'v': 1,
            'quelle': 'feat/schleusingen-ansicht: aus viz3/extra/schleusingen-ansicht/dist/schleusingen-ansicht/fassaden.json '
                      '(private Ansichten von der Straße, von Hand gelesen) – tools/schleusingen-ansicht/ansicht.py',
            'b': {f"#{r['i']}": look(r) for r in doc['gebaeude']}}


if __name__ == '__main__':
    out = OUT
    if '--out' in sys.argv:
        out = sys.argv[sys.argv.index('--out') + 1]
    doc = json.load(open(SRC))
    a = build(doc)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w') as f:
        json.dump(a, f, ensure_ascii=False, indent=0)
        f.write('\n')
    from collections import Counter
    print(f"{len(a['b'])} looks → {os.path.relpath(out, ROOT)}", dict(Counter(L['material'] for L in a['b'].values())))
