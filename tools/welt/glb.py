"""Minimal glTF 2.0 binary writer (GLB) for the world tiles: triangle meshes with POSITION, NORMAL, COLOR_0 (given in sRGB, stored linear), TEXCOORD_0,
one material per mesh (vertex colours, metallic 0). Extras carry the tile placement (UTM centre, H0) for any loader."""
import json, struct
import numpy as np


def _pad(b, fill=b'\x00'):
    return b + fill * ((4 - len(b) % 4) % 4)


def write_glb(path, meshes, extras=None):
    """meshes: list of dicts {name, pos (n,3) f32, idx (m,) u32, nrm?, col? (n,3|4) f32 0..1, uv? (n,2), rough?, double?}"""
    bin_parts, views, accessors, gl_meshes, materials, nodes = [], [], [], [], [], []
    off = 0

    def add(arr, target, comp, typ, normalized=False, minmax=False):
        nonlocal off
        a = np.ascontiguousarray(arr)
        b = a.tobytes()
        views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b), **({'target': target} if target else {})})
        acc = {'bufferView': len(views) - 1, 'componentType': comp, 'count': int(a.shape[0]), 'type': typ}
        if normalized:
            acc['normalized'] = True
        if minmax:
            acc['min'] = [float(v) for v in a.min(axis=0)]
            acc['max'] = [float(v) for v in a.max(axis=0)]
        accessors.append(acc)
        bp = _pad(b)
        bin_parts.append(bp)
        off += len(bp)
        return len(accessors) - 1

    for m in meshes:
        pos = np.asarray(m['pos'], np.float32)
        if len(pos) == 0:
            continue
        idx = np.asarray(m['idx'])
        idx = idx.astype(np.uint16 if pos.shape[0] < 65536 else np.uint32)
        attrs = {'POSITION': add(pos, 34962, 5126, 'VEC3', minmax=True)}
        if m.get('nrm') is not None:
            attrs['NORMAL'] = add(np.asarray(m['nrm'], np.float32), 34962, 5126, 'VEC3')
        if m.get('col') is not None:
            # colours are given in sRGB (as picked by eye); glTF vertex colours are linear
            cs = np.clip(np.asarray(m['col'], np.float32), 0, 1)
            cl = np.where(cs <= 0.04045, cs / 12.92, ((cs + 0.055) / 1.055) ** 2.4)
            c = np.clip(cl * 255 + 0.5, 0, 255).astype(np.uint8)
            if c.shape[1] == 3:   # vertex colours as normalized unsigned bytes, padded to 4 for alignment
                c = np.concatenate([c, np.full((len(c), 1), 255, np.uint8)], 1)
            attrs['COLOR_0'] = add(c, 34962, 5121, 'VEC4', normalized=True)
        if m.get('uv') is not None:
            attrs['TEXCOORD_0'] = add(np.asarray(m['uv'], np.float32), 34962, 5126, 'VEC2')
        ia = add(idx, 34963, 5125 if idx.dtype == np.uint32 else 5123, 'SCALAR')
        materials.append({'name': m.get('name', 'mat'), 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0.0,
                                                                                  'roughnessFactor': float(m.get('rough', 0.95))},
                          **({'doubleSided': True} if m.get('double') else {})})
        gl_meshes.append({'name': m.get('name', 'mesh'), 'primitives': [{'attributes': attrs, 'indices': ia, 'material': len(materials) - 1, 'mode': 4}]})
        nodes.append({'mesh': len(gl_meshes) - 1, 'name': m.get('name', 'mesh')})
    doc = {'asset': {'version': '2.0', 'generator': 'pavillon-ratscher tools/welt'}, 'scene': 0,
           'scenes': [{'nodes': list(range(len(nodes)))}], 'nodes': nodes, 'meshes': gl_meshes, 'materials': materials,
           'accessors': accessors, 'bufferViews': views, 'buffers': [{'byteLength': off}]}
    if extras:
        doc['extras'] = extras
    j = _pad(json.dumps(doc, separators=(',', ':')).encode(), b' ')
    binb = b''.join(bin_parts)
    total = 12 + 8 + len(j) + 8 + len(binb)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(j), 0x4E4F534A) + j)
        f.write(struct.pack('<II', len(binb), 0x004E4942) + binb)
    return total


def flat_normals(pos, idx):
    """per-vertex normals averaged from the faces (for smooth ribbons) – pos (n,3), idx (m,)"""
    p = np.asarray(pos, np.float64)
    t = np.asarray(idx).reshape(-1, 3)
    fn = np.cross(p[t[:, 1]] - p[t[:, 0]], p[t[:, 2]] - p[t[:, 0]])
    n = np.zeros_like(p)
    for k in range(3):
        np.add.at(n, t[:, k], fn)
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    n = np.where(ln > 1e-12, n / np.maximum(ln, 1e-12), [0, 1, 0])
    return n.astype(np.float32)
