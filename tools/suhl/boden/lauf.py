#!/usr/bin/env python3
"""suhl-boden: the numbers of one run as a small JSON (and as a table for the workflow summary).

  python3 -I tools/suhl/boden/lauf.py --set DIR --mode stadt --pruefen FILE --raw DIR --out DIR [--summary FILE]

Writes <out>/lauf.json (tiles and megabytes per level, run time, sources, what was skipped, the result of the checks) and copies
meta.json and the checks next to it - the workflow commits that folder to the branch (tools/suhl/out/boden/actions/<mode>/).
"""
import argparse, json, os, shutil, sys, time


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--set', required=True)
    ap.add_argument('--mode', required=True)
    ap.add_argument('--pruefen', default='')
    ap.add_argument('--raw', default='')
    ap.add_argument('--out', required=True)
    ap.add_argument('--summary', default='')
    ap.add_argument('--seconds', type=float, default=0)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    e = os.environ
    R = {'made': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'mode': a.mode,
         'run': {'id': e.get('GITHUB_RUN_ID', ''), 'attempt': e.get('GITHUB_RUN_ATTEMPT', ''), 'sha': e.get('GITHUB_SHA', ''),
                 'ref': e.get('GITHUB_REF_NAME', ''), 'url': f"https://github.com/{e.get('GITHUB_REPOSITORY', '')}/actions/runs/{e.get('GITHUB_RUN_ID', '')}" if e.get('GITHUB_RUN_ID') else ''},
         'ok': False}
    mp = os.path.join(a.set, 'meta.json')
    if not os.path.exists(mp):
        R['error'] = 'no meta.json - the build did not finish'
    else:
        meta = json.load(open(mp, encoding='utf-8'))
        lv = meta['tiling']['levels']
        R['version'] = (meta.get('suhl') or {}).get('version')
        R['levels'] = {L: {'tile_m': v['size'], 'n': len(v['has']), 'terrain_bytes': (v.get('terrain') or {}).get('bytes', 0),
                           'image_bytes': (v.get('image') or {}).get('bytes', 0)} for L, v in lv.items()}
        tt = sum(v['terrain_bytes'] for v in R['levels'].values())
        ti = sum(v['image_bytes'] for v in R['levels'].values())
        R['total'] = {'tiles': sum(v['n'] for v in R['levels'].values()), 'files': 2 * sum(v['n'] for v in R['levels'].values()),
                      'terrain_mb': round(tt / 1e6, 2), 'image_mb': round(ti / 1e6, 2), 'mb': round((tt + ti) / 1e6, 2)}
        s = meta['sources']
        R['sources'] = {k: s.get(k) for k in ('terrain_source', 'dgm1', 'dgm1_tiles_km', 'dgm1_level10_tiles', 'copernicus_offset_m', 'canopy_m',
                                              'terrain_method', 'imagery_method', 'imagery_balance', 'roads')}
        R['plan'] = (meta.get('suhl') or {}).get('plan')
        R['cut'] = (meta.get('suhl') or {}).get('cut')
        if os.path.abspath(mp) != os.path.abspath(os.path.join(a.out, 'meta.json')):
            shutil.copyfile(mp, os.path.join(a.out, 'meta.json'))
        if os.path.exists(os.path.join(a.set, 'index.json')):
            shutil.copyfile(os.path.join(a.set, 'index.json'), os.path.join(a.out, 'index.json'))
    bp = os.path.join(a.raw, f'build_{a.mode}.json') if a.raw else ''
    if bp and os.path.exists(bp):
        R['build'] = {k: v for k, v in json.load(open(bp)).items() if k in ('files', 'bytes', 'seconds')}
    if a.seconds:
        R['seconds_all_steps'] = round(a.seconds)
    if a.pruefen and os.path.exists(a.pruefen):
        P = json.load(open(a.pruefen, encoding='utf-8'))
        R['checks'] = {'ok': not P['fails'], 'fails': P['fails'], 'n': len(P['checks']), 'edges': P.get('edges'), 'heights_nhn': P.get('heights_nhn'),
                       'level_to_parent': P.get('level_to_parent')}
        if os.path.abspath(a.pruefen) != os.path.abspath(os.path.join(a.out, 'pruefen.json')):
            shutil.copyfile(a.pruefen, os.path.join(a.out, 'pruefen.json'))
        R['ok'] = 'error' not in R and not P['fails']
    json.dump(R, open(os.path.join(a.out, 'lauf.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    md = [f"### Suhl – Boden, Modus `{a.mode}`" + (f", Version `{R.get('version')}`" if R.get('version') else ''), '']
    if 'levels' in R:
        md += ['| Stufe | Kachel | Kacheln | Gelände MB | Luftbild MB | Bild kB je Kachel |', '|---|---|---|---|---|---|']
        for L in sorted(R['levels'], key=int, reverse=True):
            v = R['levels'][L]
            md.append(f"| {L} | {v['tile_m']:.0f} m | {v['n']} | {v['terrain_bytes'] / 1e6:.2f} | {v['image_bytes'] / 1e6:.2f} | {v['image_bytes'] / 1e3 / max(v['n'], 1):.1f} |")
        t = R['total']
        md += [f"| **Summe** | | **{t['tiles']}** | **{t['terrain_mb']}** | **{t['image_mb']}** | |", '',
               f"Zusammen {t['mb']} MB in {t['files']} Dateien." + (f" Bauzeit {R['build']['seconds']} s." if 'build' in R else ''), '']
        d = (R['sources'].get('dgm1') or {})
        md.append(f"Gelände: `{R['sources'].get('terrain_source')}`; DGM1-Kacheln {d.get('have', 0)} von {d.get('asked', 0)} "
                  f"(Cache {d.get('from_cache', 0)}, Landes-Adresse {d.get('from_state_host', 0)}, easygeodata {d.get('from_providers', 0)}); "
                  f"Landes-Adresse zeigt die Wartungsseite: {'ja' if d.get('state_host_down') else 'nein'}; "
                  f"Kacheln der Stufe 10 auf echtem Gelände: {R['sources'].get('dgm1_level10_tiles')}.")
    if 'checks' in R:
        md += ['', ('✅ alle Prüfungen bestanden' if R['checks']['ok'] else '❌ Prüfungen fehlgeschlagen: ' + ', '.join(R['checks']['fails']))
               + f" ({R['checks']['n']} Prüfungen; Kanten: {json.dumps(R['checks']['edges'])})"]
    if 'error' in R:
        md += ['', '❌ ' + R['error']]
    txt = '\n'.join(md) + '\n'
    print(txt)
    if a.summary:
        with open(a.summary, 'a', encoding='utf-8') as f:
            f.write(txt)


if __name__ == '__main__':
    main()
