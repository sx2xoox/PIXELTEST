"""Procedural VFX sprite helpers (numpy) + a small timeline previewer."""
import math
import numpy as np
from PIL import Image, ImageDraw

SS = 2  # supersampling


def grid(n):
    N = n * SS
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    return (xx + 0.5) / SS, (yy + 0.5) / SS


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0 + 1e-9), 0, 1)
    return t * t * (3 - 2 * t)


# colour grades: list of (threshold, rgba) from hot to cold
GRADE_BLOOD = [(0.86, (255, 236, 228, 255)), (0.66, (255, 84, 76, 255)), (0.42, (208, 26, 42, 255)),
               (0.20, (110, 8, 22, 235)), (0.06, (40, 2, 8, 170))]
GRADE_DARK = [(0.88, (255, 214, 200, 255)), (0.72, (255, 52, 52, 255)), (0.52, (170, 12, 28, 255)),
              (0.30, (70, 4, 14, 250)), (0.10, (14, 2, 6, 220))]
GRADE_SCARLET = [(0.84, (255, 246, 240, 255)), (0.62, (255, 110, 96, 255)), (0.40, (236, 40, 52, 255)),
                 (0.18, (140, 12, 28, 220))]


def grade(I, g, n):
    """Map intensity field (SS-res) to banded RGBA, then downsample to n."""
    out = np.zeros(I.shape + (4,), float)
    for th, col in reversed(g):
        m = I >= th
        out[m] = col
    img = Image.fromarray(out.astype(np.uint8), 'RGBA')
    if SS > 1:
        img = img.resize((n, n), Image.BOX)
    return img


def ang_diff(a, b):
    return (a - b + math.pi) % (2 * math.pi) - math.pi


def arc_field(n, cx, cy, R, width, a_tail, a_head, inner_soft=0.55, ripple=0.0, seed=0, erode=0.0, squash=1.0):
    """Crescent slash intensity. angles in radians, standard math (y up), sweep from tail to head
    (either direction). Thickness grows toward head and tapers to a point at both ends."""
    x, y = grid(n)
    dx = x - cx; dy = (cy - y) / squash
    r = np.hypot(dx, dy)
    th = np.arctan2(dy, dx)
    span = a_head - a_tail
    s = ang_diff(th, a_tail) / span if abs(span) > 1e-6 else np.zeros_like(th)
    # make s continuous for big spans
    s = np.where(np.sign(ang_diff(th, a_tail)) == np.sign(span), s, s)
    s = (ang_diff(th, a_tail) * np.sign(span)) % (2 * math.pi) / abs(span)
    inside = (s >= 0) & (s <= 1)
    prof = np.clip(s, 0, 1) ** 0.8 * smooth(1.0, 0.86, s)  # grows then sharp tip
    w = width * prof
    d_out = R - r                    # distance inside the outer edge
    rel = np.where(w > 1e-3, d_out / np.maximum(w, 1e-3), 9)
    I = np.where(inside & (rel >= 0) & (rel <= 1), 1 - np.clip(rel, 0, 1) ** inner_soft * 0.95, 0)
    I *= (0.35 + 0.65 * np.clip(s, 0, 1))   # fade toward tail
    if ripple:
        I *= 1 - ripple * (0.5 + 0.5 * np.sin(th * 40 + r * 0.6))
    if erode > 0:
        rng = np.random.default_rng(seed)
        nz = blob_noise(I.shape, rng, scale=6 * SS)
        I = np.where(nz < erode, 0, I * (1 - erode * 0.6))
    return I


def blob_noise(shape, rng, scale=8):
    h, w = shape
    sh = (max(2, h // scale + 2), max(2, w // scale + 2))
    small = rng.random(sh)
    img = Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.array(img).astype(float) / 255


def streaks(n, cx, cy, R, a0, a1, count, seed, length=0.25, width=1.2):
    """thin speed-line arcs near radius R."""
    x, y = grid(n)
    dx = x - cx; dy = cy - y
    r = np.hypot(dx, dy); th = np.arctan2(dy, dx)
    rng = np.random.default_rng(seed)
    I = np.zeros_like(r)
    span = a1 - a0
    for _ in range(count):
        rr = R * rng.uniform(0.75, 1.08)
        st = rng.uniform(0, 1 - length)
        aa0 = a0 + span * st; aa1 = aa0 + span * length * rng.uniform(0.5, 1)
        s = (ang_diff(th, aa0) * np.sign(span)) % (2 * math.pi) / abs(aa1 - aa0)
        m = (s >= 0) & (s <= 1)
        d = np.abs(r - rr)
        I = np.maximum(I, np.where(m, np.clip(1 - d / width, 0, 1) * (0.3 + 0.6 * s), 0))
    return I


def droplets(n, pts, seed=0):
    """pts: list of (x, y, radius, intensity, stretch_dx, stretch_dy) -> intensity field (teardrops)."""
    x, y = grid(n)
    I = np.zeros_like(x)
    for (px, py, rad, inten, sx, sy) in pts:
        L = math.hypot(sx, sy)
        if L < 1e-3:
            ux, uy, L = 1.0, 0.0, 0.0
        else:
            ux, uy = sx / L, sy / L
        dx = x - px; dy = y - py
        along = dx * ux + dy * uy
        perp = -dx * uy + dy * ux
        # capsule tail behind the drop
        t = np.clip(-along / max(L, 1e-3), 0, 1)
        radius = rad * (1 - 0.8 * t)
        d = np.where(along < 0, np.where(-along <= L, np.abs(perp), np.hypot(perp, -along - L)), np.hypot(perp, along))
        f = np.clip(1 - d / np.maximum(radius, 0.3), 0, 1)
        I = np.maximum(I, f ** 0.5 * inten)
    return I


def ring(n, cx, cy, R, width, inten=1.0, squash=1.0, broken=0.0, seed=0):
    x, y = grid(n)
    r = np.hypot(x - cx, (y - cy) / squash)
    d = np.abs(r - R) / width
    I = np.clip(1 - d, 0, 1) ** 0.7 * inten
    I *= np.clip((r - (R - width)) / max(width, 1e-3), 0, 1) * 0.4 + 0.6
    if broken > 0:
        th = np.arctan2(y - cy, x - cx)
        rng = np.random.default_rng(seed)
        ph = rng.uniform(0, 6.28)
        I *= (np.sin(th * 7 + ph) * 0.5 + 0.5 > broken)
    return I


def spike(n, base_x, base_y, height, width, lean=0.0):
    """Thorn/spike rising from base (pixels), tip at base_y-height."""
    x, y = grid(n)
    t = (base_y - y) / max(height, 1e-3)     # 0 at base, 1 at tip
    cxl = base_x + lean * t * height
    half = width * 0.5 * np.clip(1 - t, 0, 1) ** 0.9
    d = np.abs(x - cxl)
    inside = (t >= 0) & (t <= 1) & (d <= half)
    shade = np.where(x < cxl, 0.95, 0.55)    # lit left face
    I = np.where(inside, shade * (0.6 + 0.4 * t) * np.clip(1 - d / np.maximum(half, 1e-3) * 0.3, 0, 1), 0)
    return I


def to_img(I, g, n):
    return grade(np.clip(I, 0, 1), g, n)


def merge(*imgs):
    base = imgs[0].copy()
    for im in imgs[1:]:
        base.alpha_composite(im)
    return base


# ====================================================================== previewer
def _rotm(rx, ry, rz):
    a, b, c = [math.radians(v) for v in (rx, ry, rz)]
    Rx = np.array([[1, 0, 0], [0, math.cos(a), -math.sin(a)], [0, math.sin(a), math.cos(a)]])
    Ry = np.array([[math.cos(b), 0, math.sin(b)], [0, 1, 0], [-math.sin(b), 0, math.cos(b)]])
    Rz = np.array([[math.cos(c), -math.sin(c), 0], [math.sin(c), math.cos(c), 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def _lerp_keys(keys, tick, field, default):
    ks = [k for k in keys if field in k]
    if not ks:
        return np.array(default, float)
    if tick <= ks[0]['tick']:
        return np.array(ks[0][field], float)
    for a, b in zip(ks, ks[1:]):
        if a['tick'] <= tick <= b['tick']:
            f = (tick - a['tick']) / max(1e-9, b['tick'] - a['tick'])
            return np.array(a[field]) * (1 - f) + np.array(b[field]) * f
    return np.array(ks[-1][field], float)


def _homography(src, dst):
    A = []
    for (x, y), (u, v) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); A.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    A = np.array(A); B = np.array([c for p in dst for c in p])
    return np.linalg.solve(A, B)


def preview_tick(tl, frames_dir, tick, size=420, cam=(2.6, 3.0, 4.2), look=(0, 1.0, -1.2), fov=55):
    """Render all tracks of timeline `tl` at `tick` from a 3rd-person camera behind/right of player."""
    cam = np.array(cam, float); look = np.array(look, float)
    fwd = look - cam; fwd /= np.linalg.norm(fwd)
    right = np.cross(fwd, [0, 1, 0]); right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    f = size / 2 / math.tan(math.radians(fov / 2))

    def P(p):
        d = np.array(p) - cam
        z = d @ fwd
        return np.array([size / 2 + (d @ right) * f / z, size / 2 - (d @ up) * f / z]), z

    img = Image.new('RGBA', (size, size), (34, 14, 20, 255))
    dr = ImageDraw.Draw(img)
    # ground grid
    for i in range(-5, 6):
        a, _ = P([i, 0, -6]); b, _ = P([i, 0, 3]); dr.line([tuple(a), tuple(b)], fill=(70, 30, 36, 255))
        a, _ = P([-5, 0, i - 1.5]); b, _ = P([5, 0, i - 1.5]); dr.line([tuple(a), tuple(b)], fill=(70, 30, 36, 255))
    # player stick figure (simple box silhouette)
    for (p0, p1, w) in [((0, 0, 0), (0, 0.75, 0), 6), ((0, 0.75, 0), (0, 1.5, 0), 10), ((0, 1.5, 0), (0, 1.85, 0), 12)]:
        a, _ = P(p0); b, _ = P(p1)
        dr.line([tuple(a), tuple(b)], fill=(90, 80, 100, 255), width=w)
    layers = []
    for tr in tl['tracks']:
        if not (tr['start_tick'] <= tick <= tr['end_tick']):
            continue
        local = tick - tr['start_tick']
        fi = min(len(tr['frames']) - 1, int(local // tr.get('ticks_per_frame', 1)))
        if tr.get('loop'):
            fi = int(local // tr.get('ticks_per_frame', 1)) % len(tr['frames'])
        tex = Image.open(f"{frames_dir}/{tr['frames'][fi]}").convert('RGBA')
        T = _lerp_keys(tr['keys'], local, 'translation', [0, 0, 0])
        Rr = _lerp_keys(tr['keys'], local, 'rotation', [0, 0, 0])
        S = _lerp_keys(tr['keys'], local, 'scale', [1, 1, 1])
        w, h = tr['size'][0] * S[0], tr['size'][1] * S[1]
        if tr.get('billboard') == 'center':
            ax, ay = right, up
        elif tr.get('billboard') == 'vertical':
            ax = right; ay = np.array([0, 1.0, 0])
        else:
            R = _rotm(*Rr)
            ax, ay = R @ np.array([1.0, 0, 0]), R @ np.array([0, 1.0, 0])
            # plane faces -Z by default; image right = -X when looking from front? use +X as image right
        c = np.array(T)
        corners = [c - ax * w / 2 + ay * h / 2, c + ax * w / 2 + ay * h / 2, c + ax * w / 2 - ay * h / 2, c - ax * w / 2 - ay * h / 2]
        pts = []; zs = []
        ok = True
        for q in corners:
            p, z = P(q)
            if z <= 0.05:
                ok = False
            pts.append(tuple(p)); zs.append(z)
        if not ok:
            continue
        tw, th = tex.size
        src = [(0, 0), (tw, 0), (tw, th), (0, th)]
        coeffs = _homography(pts, src)
        warped = tex.transform((size, size), Image.PERSPECTIVE, tuple(coeffs), Image.BILINEAR)
        layers.append((np.mean(zs), warped))
    for _, w in sorted(layers, key=lambda x: -x[0]):
        img.alpha_composite(w)
    dr = ImageDraw.Draw(img)
    dr.text((6, 6), f"t={tick}", fill=(255, 255, 255, 255))
    return img
