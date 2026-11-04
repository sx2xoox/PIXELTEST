"""Minimal Blockbench 5.0 (.bbmodel) builder + procedural cube texturing + a tiny
software renderer used only for self-checking. Written from scratch for this bench."""
import base64, io, json, math, uuid as _uuid
import numpy as np
from PIL import Image


def uid():
    return str(_uuid.uuid4())


def hexc(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def png_data_url(img):
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


# ---------------------------------------------------------------- palettes
RAMPS = {
    # dark -> light
    'iron':     ['#0d0b10', '#1a171e', '#29242e', '#3b3541', '#565060', '#857c8c'],
    'iron_red': ['#120609', '#22090f', '#3a1018', '#561722', '#77242f', '#a33a44'],
    'bone':     ['#3a2e22', '#6b5a45', '#9c8a6c', '#c2b393', '#ddd0b0', '#f3ead2'],
    'blood':    ['#1c0306', '#3d050c', '#660a14', '#8f101d', '#c01b2a', '#ec4a4f'],
    'glow':     ['#6e0710', '#b0101c', '#e22430', '#ff5a4a', '#ff9a7a', '#ffe0cc'],
    'obsidian': ['#07050c', '#110b1a', '#1c1229', '#2a1b3d', '#3f2a59', '#6a4a8c'],
    'leather':  ['#140806', '#26100b', '#3b1a12', '#55271a', '#703624', '#8f4a33'],
    'fur':      ['#12060a', '#220a10', '#361018', '#4c1620', '#661e2a', '#86303a'],
    'cloth':    ['#150509', '#25080f', '#3a0d17', '#521320', '#6e1b2a', '#8d2738'],
    'gold':     ['#2a1606', '#4f2c0c', '#7a4a14', '#a8701f', '#d4a03a', '#f6d77a'],
    'skin':     ['#1e0a0e', '#341118', '#4c1822', '#64202c', '#7e2c38', '#9c404a'],
}


def ramp_rgba(name):
    return [hexc(c) for c in RAMPS[name]]


FACE_LEVEL = {'up': 1, 'down': -2, 'north': 0, 'south': -1, 'east': -1, 'west': 0}


def paint_face(mat, face, fw, fh, rng):
    """Return (fh, fw, 4) uint8 for a face of a cube with material `mat`."""
    if fw <= 0 or fh <= 0:
        return np.zeros((max(fh, 0), max(fw, 0), 4), np.uint8)
    ramp = ramp_rgba(mat)
    base = 3 + FACE_LEVEL[face]
    lvl = np.full((fh, fw), base, np.int32)
    side = face not in ('up', 'down')
    # texture noise
    n = rng.random((fh, fw))
    lvl[n < 0.12] -= 1
    lvl[n > 0.93] += 1
    if side and fh >= 3:
        lvl[0, :] += 1           # lit top rim
        lvl[-1, :] -= 1          # shadowed bottom rim
    if fw >= 3:
        lvl[:, 0] -= (1 if side else 0)
    if mat in ('iron', 'iron_red', 'obsidian', 'gold'):
        # beveled plate: bright top-left edge, dark right edge
        if fw >= 4 and fh >= 4:
            lvl[1:, -1] -= 1
            lvl[0, :] += 0
        # scratches
        for _ in range(max(1, fw * fh // 40)):
            if rng.random() < 0.5 and fw > 3:
                y = rng.integers(0, fh); x = rng.integers(0, fw - 2)
                lvl[y, x:x + 2] += 1
        if mat == 'obsidian':
            for _ in range(max(1, fw * fh // 30)):
                y = rng.integers(0, fh); x = rng.integers(0, fw)
                lvl[y, x] = 5
        # rivets on big plates
        if mat in ('iron', 'iron_red') and fw >= 6 and fh >= 6 and side:
            for (yy, xx) in [(1, 1), (1, fw - 2), (fh - 2, 1), (fh - 2, fw - 2)]:
                lvl[yy, xx] = 5
    elif mat == 'bone':
        lvl[n < 0.12] += 1          # bone is smoother than metal: undo most noise
        for _ in range(max(1, fw * fh // 60)):
            y = rng.integers(0, fh); x = rng.integers(0, fw)
            lvl[y, x] -= 1
            if y + 1 < fh and rng.random() < 0.6:
                lvl[y + 1, min(fw - 1, x + rng.integers(-1, 2))] -= 1
    elif mat == 'blood':
        if side:
            for x in range(fw):
                if rng.random() < 0.35:
                    L = rng.integers(1, max(2, fh))
                    lvl[:L, x] += 1
            hs = rng.integers(0, fw * fh)
            lvl.flat[hs] = 5
        else:
            lvl[rng.random((fh, fw)) > 0.85] = 5
    elif mat == 'glow':
        lvl[:] = 3
        lvl[rng.random((fh, fw)) > 0.7] = 4
        if fw >= 3 and fh >= 3:
            lvl[1:-1, 1:-1] = 4
            lvl[fh // 2, fw // 2] = 5
    elif mat == 'leather':
        # diagonal wrap bands
        yy, xx = np.mgrid[0:fh, 0:fw]
        band = ((yy + xx) % 3 == 0)
        lvl[band] -= 1
    elif mat in ('fur', 'cloth'):
        yy, xx = np.mgrid[0:fh, 0:fw]
        if side:
            stripes = (xx % 2 == 0) & (rng.random((fh, fw)) < 0.5)
            lvl[stripes] -= 1
    lvl = np.clip(lvl, 0, len(ramp) - 1)
    out = np.array(ramp, np.uint8)[lvl]
    return out


FACES = ['north', 'east', 'south', 'west', 'up', 'down']


class Model:
    def __init__(self, name, seed=1):
        self.name = name
        self.groups = []      # dicts
        self.elements = []
        self.cubes = []       # (element, mat, decals)
        self.rng = np.random.default_rng(seed)
        self.animations = []
        self.gidx = {}

    # ------------------------------------------------------------- structure
    def group(self, name, origin, parent=None, rotation=(0, 0, 0)):
        g = {'name': name, 'origin': list(origin), 'color': 0, 'nbt': '{}', 'uuid': uid(),
             'export': True, 'mirror_uv': False, 'isOpen': True, 'locked': False,
             'visibility': True, 'autouv': 0, 'selected': False, 'primary_selected': False,
             'rotation': list(rotation), 'parent': parent, 'children': []}
        self.groups.append(g)
        self.gidx[name] = g
        if parent:
            self.gidx[parent]['children'].append(('g', g['uuid']))
        return name

    def cube(self, name, frm, to, group, mat, origin=None, rotation=None, decals=None,
             inflate=0, mirror=False):
        frm = [float(v) for v in frm]; to = [float(v) for v in to]
        el = {'name': name, 'box_uv': False, 'rescale': False, 'locked': False,
              'light_emission': 0, 'render_order': 'default', 'allow_mirror_modeling': True,
              'from': frm, 'to': to, 'autouv': 0, 'color': 0, 'inflate': inflate,
              'origin': list(origin) if origin else [(a + b) / 2 for a, b in zip(frm, to)],
              'faces': {}, 'type': 'cube', 'uuid': uid()}
        if rotation:
            el['rotation'] = list(rotation)
        if mat == 'glow':
            el['light_emission'] = 15
        self.elements.append(el)
        self.cubes.append((el, mat, decals or {}))
        self.gidx[group]['children'].append(('e', el['uuid']))
        return el

    # ------------------------------------------------------------- texture
    def build_texture(self, width=None):
        sizes = []
        for el, mat, dec in self.cubes:
            w, h, d = [max(1, int(math.ceil(abs(el['to'][i] - el['from'][i]) - 1e-6))) for i in range(3)]
            sizes.append((2 * d + 2 * w, d + h, w, h, d))
        total = sum(a * b for a, b, *_ in sizes)
        W = width or max(64, 1 << int(math.ceil(math.log2(math.sqrt(total * 1.6)))))
        W = max(W, max(s[0] for s in sizes))
        # shelf pack, tallest first
        order = sorted(range(len(sizes)), key=lambda i: -sizes[i][1])
        x = y = rowh = 0
        pos = {}
        for i in order:
            rw, rh = sizes[i][:2]
            if x + rw > W:
                x = 0; y += rowh; rowh = 0
            pos[i] = (x, y)
            x += rw; rowh = max(rowh, rh)
        H = y + rowh
        H = 1 << int(math.ceil(math.log2(max(H, 16))))
        H = max(H, 16)
        atlas = np.zeros((H, W, 4), np.uint8)
        for i, (el, mat, dec) in enumerate(self.cubes):
            _, _, w, h, d = sizes[i]
            u, v = pos[i]
            rects = {'up': (u + d, v, w, d), 'down': (u + d + w, v, w, d),
                     'east': (u, v + d, d, h), 'north': (u + d, v + d, w, h),
                     'west': (u + d + w, v + d, d, h), 'south': (u + 2 * d + w, v + d, w, h)}
            for f, (fx, fy, fw, fh) in rects.items():
                fm = dec.get(f + '_mat', mat)
                tile = paint_face(fm, f, fw, fh, self.rng)
                if f in dec:
                    dec[f](tile)
                elif '*' in dec:
                    dec['*'](tile, f)
                atlas[fy:fy + fh, fx:fx + fw] = tile
                face = {'uv': [fx, fy, fx + fw, fy + fh], 'texture': 0}
                if f == 'down':  # Blockbench/Java: down face top edge = south
                    face['uv'] = [fx, fy + fh, fx + fw, fy]
                el['faces'][f] = face
        self.atlas = Image.fromarray(atlas, 'RGBA')
        self.W, self.H = W, H
        return self.atlas

    # ------------------------------------------------------------- animation
    def anim(self, name, length, tracks, loop='loop'):
        """tracks: {group_name: {'rotation': [(t,[x,y,z]),...], 'position': [...], 'scale': [...]}}"""
        animators = {}
        for gname, chans in tracks.items():
            g = self.gidx[gname]
            kfs = []
            for ch, keys in chans.items():
                for item in keys:
                    t, v = item[0], item[1]
                    interp = item[2] if len(item) > 2 else 'linear'
                    kfs.append({'channel': ch, 'data_points': [{'x': round(v[0], 3), 'y': round(v[1], 3), 'z': round(v[2], 3)}],
                                'uuid': uid(), 'time': round(t, 4), 'color': -1, 'interpolation': interp,
                                'bezier_linked': True, 'bezier_left_time': [-0.1, -0.1, -0.1],
                                'bezier_left_value': [0, 0, 0], 'bezier_right_time': [0.1, 0.1, 0.1],
                                'bezier_right_value': [0, 0, 0]})
            animators[g['uuid']] = {'name': gname, 'type': 'bone', 'keyframes': kfs}
        self.animations.append({'uuid': uid(), 'name': name, 'loop': loop, 'override': False,
                                'length': length, 'snapping': 20, 'selected': False,
                                'saved': True, 'path': '',
                                'anim_time_update': '', 'blend_weight': '', 'start_delay': '',
                                'loop_delay': '', 'animators': animators})

    # ------------------------------------------------------------- export
    def to_json(self, tex_name):
        if not hasattr(self, 'atlas'):
            self.build_texture()

        def outl(g):
            node = {'uuid': g['uuid'], 'isOpen': True, 'children': []}
            for kind, u in g['children']:
                if kind == 'e':
                    node['children'].append(u)
                else:
                    node['children'].append(outl(next(x for x in self.groups if x['uuid'] == u)))
            return node

        groups_out = []
        for g in self.groups:
            gg = {k: v for k, v in g.items() if k not in ('parent', 'children')}
            groups_out.append(gg)
        outliner = [outl(g) for g in self.groups if g['parent'] is None]
        tex = {'path': '', 'name': tex_name, 'folder': '', 'namespace': '', 'id': '0',
               'group': '', 'width': self.W, 'height': self.H, 'uv_width': self.W, 'uv_height': self.H,
               'particle': False, 'use_as_default': False, 'layers_enabled': False,
               'sync_to_project': '', 'render_mode': 'default', 'render_sides': 'auto',
               'pbr_channel': 'color', 'frame_time': 1, 'frame_order_type': 'loop', 'frame_order': '',
               'frame_interpolate': False, 'visible': True, 'internal': True, 'saved': True,
               'uuid': uid(), 'relative_path': '', 'source': png_data_url(self.atlas)}
        return {
            'meta': {'format_version': '5.0', 'model_format': 'free', 'box_uv': False},
            'name': self.name, 'model_identifier': self.name, 'visible_box': [1, 1, 0],
            'variable_placeholders': '', 'variable_placeholder_buttons': [], 'timeline_setups': [],
            'unhandled_root_fields': {},
            'resolution': {'width': self.W, 'height': self.H},
            'elements': self.elements, 'groups': groups_out, 'outliner': outliner,
            'textures': [tex], 'animations': self.animations,
        }

    def save(self, path, tex_name):
        d = self.to_json(tex_name)
        with open(path, 'w') as f:
            json.dump(d, f, ensure_ascii=False)
        return d


# =================================================================== renderer
def _rot(deg, order='ZYX'):
    x, y, z = [math.radians(a) for a in deg]
    Rx = np.array([[1, 0, 0], [0, math.cos(x), -math.sin(x)], [0, math.sin(x), math.cos(x)]])
    Ry = np.array([[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]])
    Rz = np.array([[math.cos(z), -math.sin(z), 0], [math.sin(z), math.cos(z), 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def _interp(keys, t, ch):
    ks = sorted([k for k in keys if k['channel'] == ch], key=lambda k: k['time'])
    if not ks:
        return None
    def val(k):
        p = k['data_points'][0]
        return np.array([float(p['x']), float(p['y']), float(p['z'])])
    if t <= ks[0]['time']:
        return val(ks[0])
    for a, b in zip(ks, ks[1:]):
        if a['time'] <= t <= b['time']:
            f = (t - a['time']) / max(1e-9, b['time'] - a['time'])
            return val(a) * (1 - f) + val(b) * f
    return val(ks[-1])


def render(model, yaw=-35, pitch=20, size=512, anim=None, t=0.0, bg=(40, 36, 44, 255), fit=None):
    """model: bbmodel dict. Returns PIL image. Entity front (-Z) faces the viewer at yaw=0."""
    tex = Image.open(io.BytesIO(base64.b64decode(model['textures'][0]['source'].split(',')[1]))).convert('RGBA')
    T = np.array(tex)
    groups = {g['uuid']: g for g in model['groups']}
    anim_d = None
    if anim:
        anim_d = next(a for a in model['animations'] if a['name'] == anim)
    # parent map via outliner
    parent = {}
    def walk(node, par):
        if isinstance(node, str):
            parent[node] = par; return
        parent[node['uuid']] = par
        for c in node['children']:
            walk(c, node['uuid'])
    for n in model['outliner']:
        walk(n, None)

    def gmat(gu):
        """4x4 world matrix for group."""
        g = groups[gu]
        o = np.array(g['origin'], float)
        rot = np.array(g.get('rotation', [0, 0, 0]), float)
        pos = np.zeros(3); scl = np.ones(3)
        if anim_d and gu in anim_d['animators']:
            kf = anim_d['animators'][gu]['keyframes']
            r = _interp(kf, t, 'rotation'); p = _interp(kf, t, 'position'); s = _interp(kf, t, 'scale')
            if r is not None:
                rot = rot + np.array([-r[0], -r[1], r[2]])
            if p is not None:
                pos = np.array([-p[0], p[1], p[2]])
            if s is not None:
                scl = s
        R = _rot(rot) @ np.diag(scl)
        M = np.eye(4)
        M[:3, :3] = R
        M[:3, 3] = o - R @ o + pos
        P = parent.get(gu)
        return (gmat(P) @ M) if P else M

    cy, sy = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    cp, sp = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))
    # camera: looks along +Z (from north side) => flip z so front faces viewer
    V = np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1]], float)
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rx = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])
    V = Rx @ Ry

    quads = []
    for el in model['elements']:
        f, to = np.array(el['from']), np.array(el['to'])
        inf = el.get('inflate', 0)
        f = f - inf; to = to + inf
        o = np.array(el.get('origin', [0, 0, 0]), float)
        R = _rot(el.get('rotation', [0, 0, 0]))
        M = gmat(parent[el['uuid']]) if parent.get(el['uuid']) else np.eye(4)
        def tr(p):
            p = R @ (p - o) + o
            return M[:3, :3] @ p + M[:3, 3]
        x0, y0, z0 = f; x1, y1, z1 = to
        # corners: TL, TR, BL per face as seen from outside (u right, v down)
        C = {
            'north': [(x1, y1, z0), (x0, y1, z0), (x1, y0, z0)],
            'south': [(x0, y1, z1), (x1, y1, z1), (x0, y0, z1)],
            'east':  [(x1, y1, z1), (x1, y1, z0), (x1, y0, z1)],
            'west':  [(x0, y1, z0), (x0, y1, z1), (x0, y0, z0)],
            'up':    [(x0, y1, z0), (x1, y1, z0), (x0, y1, z1)],
            'down':  [(x0, y0, z1), (x1, y0, z1), (x0, y0, z0)],
        }
        for fn, fc in el['faces'].items():
            if fc.get('texture') is None:
                continue
            pts = [tr(np.array(p, float)) for p in C[fn]]
            quads.append((pts, fc['uv'], fn))
    allp = np.array([p for q in quads for p in q[0]])
    # project
    def proj(p):
        q = V @ np.array([-p[0], p[1], -p[2]])  # viewer stands at -Z looking +Z
        return q
    P = np.array([proj(p) for p in allp])
    if fit is None:
        mn, mx = P[:, :2].min(0), P[:, :2].max(0)
        span = max(mx - mn) * 1.1
        ctr = (mn + mx) / 2
    else:
        ctr, span = np.array(fit[0]), fit[1]
    sc = size / span
    img = np.zeros((size, size, 4), float); img[:] = bg
    zb = np.full((size, size), -1e9)
    light = np.array([0.4, 0.8, -0.45]); light /= np.linalg.norm(light)
    for pts, uv, fn in quads:
        A, B, D = [proj(p) for p in pts]
        n = np.cross(B - A, D - A)
        nn = np.linalg.norm(n)
        if nn < 1e-9:
            continue
        n /= nn
        # world-space normal for lighting
        wn = np.cross(pts[1] - pts[0], pts[2] - pts[0]); wn = wn / (np.linalg.norm(wn) + 1e-9)
        wn = np.array([-wn[0], wn[1], -wn[2]])
        shade = 0.6 + 0.4 * max(0.0, float(np.dot(wn, light)))
        def scr(q):
            return np.array([(q[0] - ctr[0]) * sc + size / 2, size / 2 - (q[1] - ctr[1]) * sc, q[2]])
        a, b, d = scr(A), scr(B), scr(D)
        c = b + d - a
        xs = [a[0], b[0], c[0], d[0]]; ys = [a[1], b[1], c[1], d[1]]
        x0, x1 = int(max(0, math.floor(min(xs)))), int(min(size - 1, math.ceil(max(xs))))
        y0, y1 = int(max(0, math.floor(min(ys)))), int(min(size - 1, math.ceil(max(ys))))
        if x1 < x0 or y1 < y0:
            continue
        yy, xx = np.mgrid[y0:y1 + 1, x0:x1 + 1] + 0.5
        e1 = b[:2] - a[:2]; e2 = d[:2] - a[:2]
        det = e1[0] * e2[1] - e1[1] * e2[0]
        if abs(det) < 1e-9:
            continue
        rx = xx - a[0]; ry = yy - a[1]
        s = (rx * e2[1] - ry * e2[0]) / det
        tt = (e1[0] * ry - e1[1] * rx) / det
        m = (s >= 0) & (s <= 1) & (tt >= 0) & (tt <= 1)
        if not m.any():
            continue
        z = a[2] + s * (b[2] - a[2]) + tt * (d[2] - a[2])
        u0, v0, u1, v1 = uv
        tu = u0 + s * (u1 - u0); tv = v0 + tt * (v1 - v0)
        iu = np.clip(np.floor(np.minimum(tu, max(u0, u1) - 1e-3)).astype(int), 0, T.shape[1] - 1)
        iv = np.clip(np.floor(np.minimum(tv, max(v0, v1) - 1e-3)).astype(int), 0, T.shape[0] - 1)
        col = T[iv, iu].astype(float)
        m &= col[..., 3] > 8
        sub_z = zb[y0:y1 + 1, x0:x1 + 1]
        m &= z > sub_z
        sub_img = img[y0:y1 + 1, x0:x1 + 1]
        lit = col[..., :3] * shade
        sub_img[m, :3] = lit[m]
        sub_img[m, 3] = 255
        sub_z[m] = z[m]
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGBA')


def sheet(images, cols, pad=4, bg=(24, 22, 28, 255)):
    w, h = images[0].size
    rows = (len(images) + cols - 1) // cols
    out = Image.new('RGBA', (cols * w + (cols + 1) * pad, rows * h + (rows + 1) * pad), bg)
    for i, im in enumerate(images):
        r, c = divmod(i, cols)
        out.paste(im, (pad + c * (w + pad), pad + r * (h + pad)))
    return out
