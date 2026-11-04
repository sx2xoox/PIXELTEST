"""직업 스킬: 혈월 수확 (Blood Moon Harvest)."""
import json, math, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from fxlib import *
from bb import sheet

OUT = os.path.join(os.path.dirname(__file__), '..', 'fx', 'skill')
PREV = os.path.join(os.path.dirname(__file__), '..', 'preview')
N = 128
D = math.radians


def save(img, name):
    img.save(os.path.join(OUT, name))
    return name


def line_field(x, y, p0, p1, w):
    p0 = np.array(p0); p1 = np.array(p1)
    d = p1 - p0; L2 = d @ d
    t = np.clip(((x - p0[0]) * d[0] + (y - p0[1]) * d[1]) / L2, 0, 1)
    px = p0[0] + t * d[0]; py = p0[1] + t * d[1]
    return np.clip(1 - np.hypot(x - px, y - py) / w, 0, 1), t


def sigil(rot, reveal):
    """Blood magic circle. rot: radians of texture rotation; reveal 0..1 draw-in."""
    x, y = grid(N)
    dx, dy = x - 64, y - 64
    r = np.hypot(dx, dy); th = (np.arctan2(dy, dx) - rot) % (2 * math.pi)
    gate = th <= reveal * 2 * math.pi + 1e-6
    I = np.zeros_like(r)
    I = np.maximum(I, ring(N, 64, 64, 60, 2.2, 0.95))
    I = np.maximum(I, ring(N, 64, 64, 53, 1.4, 0.75))
    I = np.maximum(I, ring(N, 64, 64, 30, 1.6, 0.85))
    I = np.maximum(I, ring(N, 64, 64, 12, 3.0, 0.7))
    # rune ticks between outer rings
    tick = (np.abs(np.sin(th * 24)) > 0.93) & (r > 54) & (r < 59)
    I = np.where(tick, np.maximum(I, 0.8), I)
    glyph = (np.sin(th * 8) > 0.6) & (np.abs(r - 56.5) < 1.0)
    I = np.where(glyph, np.maximum(I, 0.5), I)
    # 7-point star (heptagram) inside
    pts = [(64 + 52 * math.cos(rot + k * 2 * math.pi / 7 - math.pi / 2), 64 + 52 * math.sin(rot + k * 2 * math.pi / 7 - math.pi / 2)) for k in range(7)]
    for k in range(7):
        f, _ = line_field(x, y, pts[k], pts[(k + 3) % 7], 1.6)
        I = np.maximum(I, f * 0.8)
    # nodes
    for (px, py) in pts:
        I = np.maximum(I, ring(N, px, py, 0, 4, 1.0))
    I = np.where(gate, I, 0)
    # inner pooled blood
    I = np.maximum(I, np.clip(1 - r / 10, 0, 1) ** 0.5 * 0.6 * reveal)
    return I


def build():
    os.makedirs(OUT, exist_ok=True)
    # --- sigil: 4 draw-in frames + 8 rotating frames
    sig = []
    for k in range(4):
        sig.append(save(to_img(sigil(0, (k + 1) / 4), GRADE_BLOOD, N), f'sigil_{k}.png'))
    for k in range(8):
        sig.append(save(to_img(sigil(-k * (2 * math.pi / 7) / 8, 1), GRADE_BLOOD, N), f'sigil_spin_{k}.png'))
    sig_frames = sig[:4] + (sig[4:] * 4)[:24]

    # --- blood moon over the head
    moon = []
    for k in range(5):
        p = (k + 1) / 5
        x, y = grid(N)
        r = np.hypot(x - 64, y - 64)
        disc = np.clip(1 - r / (34 * min(1, p * 1.6)), 0, 1)
        I = np.where(disc > 0, 0.45 + 0.5 * np.clip((64 - y) / 60 + (64 - x) / 90 + 0.3, 0, 1), 0)
        # eclipse bite (dark crescent)
        r2 = np.hypot(x - 64 - 14 * p, y - 58)
        I = np.where((disc > 0) & (r2 < 28 * p), 0.22, I)
        I = np.maximum(I, ring(N, 64, 64, 44 + 6 * math.sin(k * 1.7), 3, 0.55 * p))
        th = np.arctan2(y - 64, x - 64)
        rays = np.clip(1 - np.abs(r - 52) / 8, 0, 1) * (np.abs(np.sin(th * 6 + k * 0.4)) > 0.85)
        I = np.maximum(I, rays * 0.5 * p)
        moon.append(save(to_img(I, GRADE_BLOOD, N), f'moon_{k}.png'))

    # --- rising blood tendrils (gathering power), vertical billboard
    tend = []
    rng = np.random.default_rng(5)
    cols = [(rng.uniform(16, 112), rng.uniform(0.4, 1.0), rng.uniform(0, 6.28)) for _ in range(9)]
    for k in range(5):
        x, y = grid(N)
        I = np.zeros_like(x)
        for (cx, h, ph) in cols:
            top = 128 - 128 * h * min(1, (k + 1) / 3)
            wob = cx + 4 * np.sin(y * 0.08 + ph + k)
            f = np.clip(1 - np.abs(x - wob) / 2.6, 0, 1) * (y > top) * np.clip((y - top) / 40, 0, 1)
            I = np.maximum(I, f * (0.9 if k < 4 else 0.5))
            hy = top + 3
            I = np.maximum(I, ring(N, cx + 4 * math.sin(hy * 0.08 + ph + k), hy, 0, 4, 0.95 if k < 4 else 0.5))
        tend.append(save(to_img(I, GRADE_BLOOD, N), f'tendril_{k}.png'))

    # --- 360 spin slash (flat), full circle sweep
    spin = []
    heads = [160, 250, 340, 430, 450, 450, 450]
    for k, hd in enumerate(heads):
        tail = max(90, hd - 300)
        er = [0, 0, 0, 0, 0.25, 0.5, 0.78][k]
        a_t, a_h = D(tail), D(min(hd, 449.9))
        I = arc_field(N, 64, 64, 60, 22, a_t, a_h, seed=k, erode=er)
        I = np.maximum(I, arc_field(N, 64, 64, 44, 10, a_t + 0.5, a_h - 0.3, seed=k + 9, erode=min(0.9, er + 0.1)) * 0.8)
        I = np.maximum(I, streaks(N, 64, 64, 58, a_t, a_h, 10, seed=k + 20, length=0.2) * (0.8 if k < 5 else 0.3))
        spin.append(save(to_img(I, GRADE_BLOOD, N), f'spin_{k}.png'))

    # --- thorn eruption (vertical billboard): one tall thorn cluster
    thorns = []
    spec = [(64, 1.0, 30, 0), (46, 0.65, 20, -8), (82, 0.7, 20, 8), (34, 0.35, 12, -10), (96, 0.4, 12, 10)]
    for k, g in enumerate([0.3, 0.75, 1.0, 1.05, 1.0, 0.9]):
        I = np.zeros((N * SS, N * SS))
        for (bx, h, w, lean) in spec:
            I = np.maximum(I, spike(N, bx, 125, 120 * h * min(g, 1), w, lean / 40))
        # blood splash at the base
        x, y = grid(N)
        I = np.maximum(I, np.clip(1 - np.hypot((x - 64) / 50, (y - 124) / 6), 0, 1) ** 0.5 * 0.7 * min(1, g))
        if k >= 4:
            nz = blob_noise(I.shape, np.random.default_rng(60 + k), 7)
            I = np.where(nz < (k - 3) * 0.35, 0, I)
        thorns.append(save(to_img(I * 0.95, GRADE_DARK, N), f'thorn_{k}.png'))

    # --- final burst ring + crimson flash
    burst = []
    for k in range(6):
        p = (k + 1) / 6
        I = ring(N, 64, 64, 14 + 48 * p, 12 * (1 - p) + 2.5, 1 - 0.45 * p, broken=0.12 * k, seed=k)
        I = np.maximum(I, ring(N, 64, 64, 8 + 34 * p, 3, 0.55 * (1 - p)))
        burst.append(save(to_img(I, GRADE_BLOOD, N), f'burst_{k}.png'))

    tracks = [
        {"id": "sigil", "frames": sig_frames, "ticks_per_frame": 2, "start_tick": 0, "end_tick": 56,
         "size": [6.5, 6.5], "billboard": "fixed",
         "keys": [{"tick": 0, "translation": [0, 0.04, 0], "rotation": [-90, 0, 0], "scale": [0.6, 0.6, 1]},
                  {"tick": 8, "translation": [0, 0.04, 0], "rotation": [-90, 0, 0], "scale": [1, 1, 1]},
                  {"tick": 50, "translation": [0, 0.04, 0], "rotation": [-90, 0, 0], "scale": [1.05, 1.05, 1]},
                  {"tick": 56, "translation": [0, 0.04, 0], "rotation": [-90, 0, 0], "scale": [1.3, 1.3, 1]}]},
        {"id": "blood_moon", "frames": moon + [moon[-1], moon[-2], moon[-1], moon[-2]], "ticks_per_frame": 2, "start_tick": 2, "end_tick": 22,
         "size": [2.2, 2.2], "billboard": "center",
         "keys": [{"tick": 0, "translation": [0, 3.0, 0], "scale": [0.6, 0.6, 1]},
                  {"tick": 16, "translation": [0, 3.3, 0], "scale": [1.1, 1.1, 1]},
                  {"tick": 20, "translation": [0, 2.6, 0], "scale": [0.4, 0.4, 1]}]},
        {"id": "tendrils", "frames": tend + [tend[3], tend[4]], "ticks_per_frame": 2, "start_tick": 6, "end_tick": 20,
         "size": [5, 3], "billboard": "vertical",
         "keys": [{"tick": 0, "translation": [0, 1.5, 0], "scale": [1, 0.8, 1]},
                  {"tick": 14, "translation": [0, 1.6, 0], "scale": [0.7, 1.1, 1]}]},
        {"id": "harvest_spin", "frames": [spin[0], spin[1], spin[2], spin[3], spin[3], spin[4], spin[5], spin[6]], "ticks_per_frame": 1, "start_tick": 22, "end_tick": 31,
         "size": [7.5, 7.5], "billboard": "fixed",
         "keys": [{"tick": 0, "translation": [0, 1.0, 0], "rotation": [-90, 0, 0], "scale": [0.85, 0.85, 1]},
                  {"tick": 8, "translation": [0, 0.9, 0], "rotation": [-90, 0, 0], "scale": [1.15, 1.15, 1]}]},
        {"id": "harvest_spin_tilt", "frames": spin[1:], "ticks_per_frame": 1, "start_tick": 23, "end_tick": 30,
         "size": [6, 6], "billboard": "fixed",
         "keys": [{"tick": 0, "translation": [0, 1.3, 0], "rotation": [-78, 0, 12], "scale": [0.9, 0.9, 1]},
                  {"tick": 7, "translation": [0, 1.3, 0], "rotation": [-78, 0, 12], "scale": [1.1, 1.1, 1]}]},
        {"id": "burst", "frames": burst, "ticks_per_frame": 2, "start_tick": 30, "end_tick": 42,
         "size": [9, 9], "billboard": "fixed",
         "keys": [{"tick": 0, "translation": [0, 0.08, 0], "rotation": [-90, 0, 0], "scale": [0.7, 0.7, 1]},
                  {"tick": 12, "translation": [0, 0.08, 0], "rotation": [-90, 0, 0], "scale": [1.25, 1.25, 1]}]},
    ]
    # thorn ring: 6 thorns erupt in sequence around the player
    for i in range(6):
        a = math.radians(90 + i * 60)
        px, pz = round(math.cos(a) * 2.8, 3), round(-math.sin(a) * 2.8, 3)
        st = 31 + i
        tracks.append({"id": f"thorn_{i}", "frames": thorns, "ticks_per_frame": 2, "start_tick": st, "end_tick": st + 13,
                       "size": [2.4, 3.2], "billboard": "vertical",
                       "keys": [{"tick": 0, "translation": [px, 1.55, pz], "scale": [1, 1, 1]},
                                {"tick": 13, "translation": [px, 1.5, pz], "scale": [1, 1, 1]}]})
    player = [
        {"tick": 0, "arm_r": [-20, 0, 10], "arm_l": [-20, 0, -10], "body": [0, 0, 0], "head": [0, 0, 0]},
        {"tick": 8, "arm_r": [-170, 0, 15], "arm_l": [-165, 0, -15], "body": [-10, 0, 0], "head": [-25, 0, 0]},
        {"tick": 20, "arm_r": [-175, 0, 10], "arm_l": [-170, 0, -10], "body": [-12, 0, 0], "head": [-30, 0, 0]},
        {"tick": 22, "arm_r": [-90, 0, -70], "arm_l": [-60, 0, 20], "body": [0, 0, 0], "head": [0, 0, 0]},
        {"tick": 26, "arm_r": [-90, 0, -70], "arm_l": [-60, 0, 20], "body": [0, 180, 0]},
        {"tick": 30, "arm_r": [-90, 0, -70], "arm_l": [-60, 0, 20], "body": [0, 360, 0]},
        {"tick": 33, "arm_r": [-40, 0, 0], "arm_l": [-40, 0, 0], "body": [20, 360, 0], "head": [10, 0, 0]},
        {"tick": 50, "arm_r": [-35, 0, 0], "arm_l": [-35, 0, 0], "body": [18, 360, 0], "head": [8, 0, 0]},
        {"tick": 58, "arm_r": [0, 0, 0], "arm_l": [0, 0, 0], "body": [0, 360, 0], "head": [0, 0, 0]},
    ]
    tl = {"name": "혈월 수확 (Blood Moon Harvest) — 피의 문양 위에 혈월을 띄워 힘을 모은 뒤 낫을 한 바퀴 휘둘러 주변을 베고, 땅에서 피의 가시를 차례로 솟구치게 한다",
          "duration_ticks": 58, "tracks": tracks, "player": player}
    with open(os.path.join(OUT, 'timeline.json'), 'w') as f:
        json.dump(tl, f, ensure_ascii=False, indent=2)
    return tl


if __name__ == '__main__':
    tl = build()
    frames = [preview_tick(tl, OUT, t, size=300, cam=(3.5, 4.5, 6.5), look=(0, 0.8, 0), fov=60) for t in [4, 12, 18, 24, 27, 31, 36, 40, 48]]
    sheet(frames, 3).save(os.path.join(PREV, 'skill.png'))
    files = sorted(f for f in os.listdir(OUT) if f.endswith('.png'))
    ims = []
    for fn in files:
        bg = Image.new('RGBA', (N, N), (30, 30, 36, 255)); bg.alpha_composite(Image.open(os.path.join(OUT, fn)))
        ims.append(bg)
    sheet(ims, 10).save(os.path.join(PREV, 'skill_sprites.png'))
    print(len(files), 'sprites')
