"""Contact sheets of the Zentrum from the Panoramax street photos: one or two sheets per street or place (six pictures
each, at most twelve per street, spread along the street and over the viewing directions), with id, place, direction and
date under each picture, plus CREDITS.md and index.json. Only the 500 px thumbnails are downloaded (cache outside the repo).
The folder goes to the scratch branch ref/suhl-fotos (push_ref.sh), never to the work branch.
    python3 tools/suhl/fotos/sheets.py <refdir> [gebiete.geojson]     ->  <refdir>/zentrum/*.jpg, CREDITS.md, index.json"""
import sys, os, math, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import slib, sheetlib

REF = os.path.abspath(sys.argv[1]); OUTDIR = os.path.join(REF, 'zentrum'); CACHE = os.environ.get('SUHL_FOTOS_CACHE', '/tmp/suhl-fotos-cache')
PER_STREET = 12


def spread(ps, n, axis):
    """Farthest-point choice in position along the street and viewing direction; returns the chosen ones in street order."""
    if not ps: return []
    # pictures from the same spot with the same view (a car waiting at a light) once only
    seen, uniq = set(), []
    for p in sorted(ps, key=lambda p: p['id']):
        key = (round(p['x'] / 4), round(p['y'] / 4), round((p['heading'] or 0) / 15))
        if key in seen: continue
        seen.add(key); uniq.append(p)
    ps = uniq
    ax, ay = math.sin(math.radians(axis)), math.cos(math.radians(axis))
    t = [p['x'] * ax + p['y'] * ay for p in ps]
    span = max(max(t) - min(t), 30.0)
    mid = (max(t) + min(t)) / 2
    order = sorted(range(len(ps)), key=lambda i: (abs(t[i] - mid), ps[i]['id']))
    chosen = [order[0]]
    while len(chosen) < min(n, len(ps)):
        best, bd = None, -1
        for i in range(len(ps)):
            if i in chosen: continue
            d = min(abs(t[i] - t[j]) / span + 0.35 * slib.angdiff(ps[i]['heading'] or 0, ps[j]['heading'] or 0) / 180 for j in chosen)
            if d > bd + 1e-9 or (abs(d - bd) <= 1e-9 and ps[i]['id'] < ps[best]['id']): best, bd = i, d
        chosen.append(best)
    return [ps[i] for i in sorted(chosen, key=lambda i: (round(t[i] / 5), ps[i]['heading'] or 0, ps[i]['id']))]


def main():
    cov = slib.load('abdeckung.json'); idx = slib.load('abdeckung_fotos.json.gz')
    byid = {p['id']: p for p in slib.load('panoramax.json.gz')['photos']}
    for p in byid.values(): p['x'], p['y'] = slib.xy(p['lat'], p['lon'])
    ids = idx['photos']
    groups = []
    for s in idx['strassen']:
        z = s.get('zentrum')
        if not z or not z.get('foto_ids'): continue
        ps = [byid[ids[i]] for i in z['foto_ids'] if ids[i] in byid]
        if not ps: continue
        a = f"{z['anteil_seite_a'] * 100:.0f} %" + (f" / {z['anteil_seite_b'] * 100:.0f} %" if s['seite_b'] else '')
        sides = f"{s['seite_a']}" + (f" / {s['seite_b']}" if s['seite_b'] else '')
        groups.append(dict(key=sheetlib.slug(s['label']), title=s['label'], ps=ps, axis=s['achse_grad'],
                           sub=f"{len(ps)} Panoramax-Fotos im Zentrum · {z['laenge_m']:.0f} m, davon {z['anteil_foto'] * 100:.0f} % mit Foto bis 25 m · Blick auf {sides}: {a}"))
    for m in cov['wahrzeichen']:
        ps = [byid[i] for i in m.get('foto_ids', []) if i in byid]
        if ps: groups.append(dict(key='ort-' + sheetlib.slug(m['name']), title='Ort: ' + m['name'], ps=ps, axis=90.0,
                                  sub=f"{m['fotos_mit_blick']} Panoramax-Fotos bis 80 m mit Blick auf das Objekt ({m['fotos_bis_80m']} bis 80 m insgesamt)"))
    groups.sort(key=lambda g: g['key'])
    index, credits, n_sheets, used = [], [], 0, set()
    for g in groups: g['sel'] = spread(g['ps'], PER_STREET, g['axis'])
    sheetlib.prefetch([p['url_small'] for g in groups for p in g['sel']], CACHE)
    for g in groups:
        sel = g['sel']
        n_parts = (len(sel) + 5) // 6
        for k in range(n_parts):
            cells = []
            for p in sel[k * 6:k * 6 + 6]:
                im = sheetlib.fetch_image(p['url_small'], CACHE, pause=0.25)
                l1 = f"{p['id'][:12]} · {g['title'].replace('Ort: ', '')} · Blick {sheetlib.wind16(p['heading'])} ({p['heading']:.0f}°)"
                l2 = f"{sheetlib.date_de(p['date'])} · {p['author']} · {p['license']} · {p['lat']:.5f}, {p['lon']:.5f} · Bildwinkel {p['fov'] or '?'}°"
                cells.append((im, l1, l2)); used.add(p['id'])
            fn = f"{g['key']}_{k + 1}.jpg"
            sheetlib.sheet('Suhl Zentrum – ' + g['title'], g['sub'] + f' · Blatt {k + 1}/{n_parts}', cells, os.path.join(OUTDIR, fn))
            n_sheets += 1
            index.append(dict(blatt='zentrum/' + fn, ort=g['title'], fotos=[dict(id=p['id'], lat=p['lat'], lon=p['lon'], heading=p['heading'], fov=p['fov'], date=p['date'][:10],
                                                                              author=p['author'], license=p['license'], page=p['page']) for p in sel[k * 6:k * 6 + 6]]))
        credits.append((g['title'], sel))
    os.makedirs(REF, exist_ok=True)
    with open(os.path.join(REF, 'index.json'), 'w', encoding='utf-8') as f: json.dump(index, f, ensure_ascii=False, indent=1)
    with open(os.path.join(REF, 'CREDITS.md'), 'w', encoding='utf-8') as f:
        f.write('# Kontaktabzüge Suhl Zentrum – Urheber und Lizenzen\n\n'
                'Straßenfotos von **Panoramax** (https://panoramax.xyz), Lizenz **CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/), '
                'Gesichter und Kennzeichen von Panoramax verpixelt. Hier verkleinert (500 px Breite) und beschriftet, sonst unverändert. '
                'Die Blätter stehen damit ebenfalls unter CC BY-SA 4.0. Karten: Straßen © OpenStreetMap-Mitwirkende (ODbL). '
                'Commons-Blätter (Ordner `commons/`, falls vorhanden) haben ihre eigene `commons/CREDITS.md`.\n\n'
                'Namensnennung je Foto: „Foto: <Urheber>, CC BY-SA 4.0, via Panoramax“.\n')
        for title, sel in credits:
            f.write(f'\n## {title}\n\n')
            for p in sel: f.write(f"- `{p['id']}` – Foto: {p['author']}, {p['license']}, via Panoramax, {p['date'][:10]} – {p['page']}\n")
    with open(os.path.join(REF, 'README.md'), 'w', encoding='utf-8') as f:
        f.write('# ref/suhl-fotos – Kontaktabzüge und Karten zur Fotoabdeckung von Suhl (Arbeitszweig, wird nie gemergt)\n\n'
                'Gemacht vom Hilfs-Agenten `suhl-fotos` (Zweig `suhl/fotos`, Dokument `docs/features/suhl-fotos.md`). Ein einzelner Commit ohne Vorgeschichte; '
                'er wird bei jedem neuen Stand ersetzt.\n\n'
                '- `zentrum/` – Kontaktabzüge der Panoramax-Straßenfotos je Straße und Ort des Zentrums (je Blatt sechs Bilder, höchstens 1024 px; '
                'unter jedem Bild: Kennung, Ort, Blickrichtung, Datum, Urheber, Lizenz, Position, Bildwinkel). `index.json` nennt die Fotos je Blatt.\n'
                '- `karten/` – Abdeckungskarten der Kernstadt und des Zentrums.\n'
                '- `commons/` – Kontaktabzüge von Wikimedia-Commons-Fotos (nur wenn der Lauf in GitHub Actions fertig wurde), mit eigener `CREDITS.md`.\n'
                '- `CREDITS.md` – Urheber, Lizenz und Quelle jedes Fotos.\n\n'
                'Straßenfotos können Menschen und Kennzeichen zeigen (bei Panoramax verpixelt). Die Bilder bleiben auf diesem Zweig und gehen nicht in die App.\n')
    au = collections.Counter(byid[i]['author'] for i in used)
    print(n_sheets, 'sheets for', len(groups), 'streets and places,', len(used), 'different pictures,', dict(au))


main()
