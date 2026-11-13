#!/usr/bin/env python3
"""Validate Suhl data against schema 1 (docs/features/suhl-daten.md). Standard library only.

    python3 -I tools/suhl/lib/validate.py <folder> [--probe] [--strict] [--quiet] [--json report.json]

<folder> is any of:
    a folder that holds suhl/            tools/suhl/out/gebaeude/probe   (a sample set, a workflow artifact, a copy of the data repo)
    one product version                  .../suhl/g/v0
    one tile file                        .../suhl/g/v0/10/497/542.json
--probe    also apply the rules of a sample set: only the 11 sample tiles (with their children and parents), at most 3 MB (ground 8 MB)
--strict   warnings count as errors
Exit status 0 = valid (warnings are printed), 1 = errors, 2 = wrong call.

Other commands:
    validate.py --index <.../suhl/<product>/v<N>> --area <probe|zentrum|kernstadt|stadt> --sources ethos,alkis,osm,dop [--note "..."]
                                         scan the folder and write its index.json (tile lists, numbers, sources, attribution)
    validate.py --doc                    print the field tables of schema 1 (the tables of docs/features/suhl-daten.md come from here)
    validate.py --sources-list           print the catalogue of sources (the ids for --sources)
"""
import argparse, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import suhllib as S   # noqa: E402
import schema         # noqa: E402
from schema import index as IX   # noqa: E402


def check_centre(folder, rep):
    """the lesson of 26.10.2026: a product that claims to cover Suhl must hold the tile with the centre of Suhl, and plausible numbers"""
    ip = os.path.join(folder, 'index.json')
    if not os.path.exists(ip):
        return
    try:
        doc = S.read_json(ip)
    except Exception:
        return
    p, area = doc.get('p'), doc.get('area')
    if p in (None, '_probe') or not isinstance(doc.get('tiles'), dict):
        return
    where = f'{p}/v{doc.get("version")}'
    for sub, lv in doc['tiles'].items():
        for Ls, ts in (lv or {}).items():
            try:
                L = int(Ls)
                if ts.get('n') and not S.tileset_has(dict(ts), *S.tile_at(L, *S.CENTRE_UTM)):
                    rep.err(where, f'the centre of Suhl (tile {S.tile_key(L, *S.tile_at(L, *S.CENTRE_UTM))}) is not among the tiles of level {L}'
                                   f'{" in " + sub if sub else ""} - wrong box?', 'centre of Suhl')
            except Exception:
                pass
    kind = {'g': 'buildings', 'b': 'trees'}.get(p)
    n = (doc.get('n') or {}).get('items')
    if kind and area in S.PLAUSIBLE[kind] and isinstance(n, int):
        try:
            S.guard_count(n, kind, area, what=where)
        except S.GuardError as ex:
            rep.err(where, str(ex), 'plausible count')


def validate(target, probe=False):
    """-> schema.Report for a root with suhl/, a product version folder or a tile file"""
    rep = schema.Report()
    t = os.path.abspath(target)
    if os.path.isfile(t):
        if os.path.basename(t) == 'index.json':
            IX.check_index(S.read_json(t), rep, t, folder=os.path.dirname(t))
        elif os.path.basename(t) == 'aktuell.json':
            IX.check_aktuell(S.read_json(t), rep, t)
        else:
            schema.check_tile_file(t, rep)
        return rep
    if not os.path.isdir(t):
        rep.err(target, 'no such file or folder')
        return rep
    if re.fullmatch(r'v[0-9]+', os.path.basename(t.rstrip('/'))):
        schema.check_product(t, rep, probe=probe)
        check_centre(t, rep)
        return rep
    root = t
    if os.path.basename(t.rstrip('/')) == 'suhl':
        root = os.path.dirname(t.rstrip('/'))
    elif not os.path.isdir(os.path.join(t, 'suhl')) and os.path.basename(os.path.dirname(t.rstrip('/'))) == 'suhl':
        vs = sorted(v for v in os.listdir(t) if re.fullmatch(r'v[0-9]+', v))      # .../suhl/<product>: all its versions
        for v in vs:
            rep.ids = {}
            schema.check_product(os.path.join(t, v), rep, probe=probe)
            check_centre(os.path.join(t, v), rep)
        if not vs:
            rep.err(target, 'no version folder v<N> inside')
        return rep
    schema.check_root(root, rep, probe=probe)
    sd = os.path.join(root, 'suhl')
    if os.path.isdir(sd):
        for p in sorted(os.listdir(sd)):
            if p in S.PRODUCTS and os.path.isdir(os.path.join(sd, p)):
                for v in sorted(os.listdir(os.path.join(sd, p))):
                    if re.fullmatch(r'v[0-9]+', v):
                        check_centre(os.path.join(sd, p, v), rep)
    return rep


def print_report(rep, target, strict=False, quiet=False):
    for k in sorted(rep.stats):
        print(f'  {k}: {rep.stats[k]}')
    if not quiet:
        for w in rep.warnings:
            print('WARNING', w)
    for e in rep.errors:
        print('ERROR  ', e)
    ok = rep.ok(strict)
    print(f'{"VALID" if ok else "NOT VALID"}: {target} - schema {S.SCHEMA} (rev {schema.REV}), {rep.n_errors()} errors, {rep.n_warnings()} warnings')
    return ok


def doc_tables():
    """the field tables as Markdown (English); docs/features/suhl-daten.md holds the German text around them"""
    out = [f'Schema {S.SCHEMA}, revision {schema.REV} (tools/suhl/lib/schema/)', '',
           '### Building record (product g, field b[] of a tile)', '', '| Field | R/O | Type | Unit, frame | Meaning |', '|---|---|---|---|---|']
    for k, req, typ, unit, mean in schema.BUILDING_FIELDS:
        out.append(f'| `{k}` | {req} | {typ} | {unit} | {mean} |')
    for title, table in (('KINDS (k)', schema.KINDS), ('ROOF_FORMS (r)', schema.ROOF_FORMS), ('ROOF_CLASSES (rk, R[].c)', schema.ROOF_CLASSES),
                         ('ERAS (era)', schema.ERAS), ('FLAGS (fg, bits)', schema.FLAGS), ('QUALITY (rq, q, S[].q)', schema.QUALITY),
                         ('TREE_KINDS (b tiles)', schema.TREE_KINDS)):
        out += ['', f'{title}: ' + '; '.join(f'{k} = {v}' for k, v in table.items())]
    out += ['', 'USES (use, eg): ' + ', '.join(schema.USES), '', 'SOURCES (src): ' + ', '.join(schema.SOURCES), '',
            'FURNITURE (m tiles, t): ' + ', '.join(schema.FURNITURE)]
    return '\n'.join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('target', nargs='?')
    ap.add_argument('--probe', action='store_true')
    ap.add_argument('--strict', action='store_true')
    ap.add_argument('--quiet', action='store_true', help='do not list warnings')
    ap.add_argument('--json', help='also write the report as JSON to this file')
    ap.add_argument('--index', metavar='FOLDER', help='write index.json of a product version folder')
    ap.add_argument('--area')
    ap.add_argument('--sources')
    ap.add_argument('--note')
    ap.add_argument('--doc', action='store_true')
    ap.add_argument('--sources-list', '--catalogue', dest='catalogue', action='store_true', help='print the catalogue of sources')
    a = ap.parse_args()
    if a.doc:
        print(doc_tables())
        return 0
    if a.catalogue:
        for k, v in IX.CATALOGUE.items():
            print(f'{k:11s} {v["licence"]:24s} {v["title"]}')
        return 0
    if a.index:
        f = os.path.abspath(a.index).rstrip('/')
        product, vname = os.path.basename(os.path.dirname(f)), os.path.basename(f)
        if product not in S.PRODUCTS or not re.fullmatch(r'v[0-9]+', vname) or not a.area or not a.sources:
            print('usage: validate.py --index <.../suhl/<product>/v<N>> --area <word> --sources id,id,...', file=sys.stderr)
            return 2
        own, old = {}, {}
        if os.path.exists(os.path.join(f, 'index.json')):                 # keep the product's own keys of an index that is already there
            try:
                old = S.read_json(os.path.join(f, 'index.json'))
                own = {k: v for k, v in old.items() if k not in IX.INDEX_KEYS}
            except Exception:
                own, old = {}, {}
        doc = IX.make_index(f, product, int(vname[1:]), a.area, [s.strip() for s in a.sources.split(',') if s.strip()], note=a.note, extra=own,
                            based_on=old.get('based_on'), write=False)
        if isinstance(old.get('attribution'), str) and old['attribution'].strip():
            doc['attribution'] = old['attribution']                        # the product's own wording of its attribution stays
        S.write_json(os.path.join(f, 'index.json'), doc)
        print(f'{f}/index.json: {doc["n"]["tiles"]} tiles, {doc["n"]["items"]} items, {doc["n"]["bytes"]} bytes; {doc["attribution"]}')
        return 0
    if not a.target:
        ap.print_usage(sys.stderr)
        return 2
    rep = validate(a.target, probe=a.probe)
    ok = print_report(rep, a.target, a.strict, a.quiet)
    if a.json:
        S.write_json(a.json, {'target': a.target, 'schema': S.SCHEMA, 'rev': schema.REV, 'valid': ok, 'errors': rep.errors, 'warnings': rep.warnings,
                              'n_errors': rep.n_errors(), 'n_warnings': rep.n_warnings(), 'stats': rep.stats}, compact=False)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
