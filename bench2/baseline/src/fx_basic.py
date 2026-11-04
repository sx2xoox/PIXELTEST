"""기본 공격 3연타: 1타 가로베기 / 2타 역사선 쌍월 + 피 분사 / 3타 내려찍기 + 지면 폭혈."""
import json, math, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from fxlib import *
from bb import sheet

OUT = os.path.join(os.path.dirname(__file__), '..', 'fx', 'basic_attack')
PREV = os.path.join(os.path.dirname(__file__), '..', 'preview')
N = 128
D = math.radians


def ease_out(p):
    return 1 - (1 - p) ** 3


def save(img, name):
    img.save(os.path.join(OUT, name))
    return name


# ------------------------------------------------------------------ 1타: 가로 베기 (thin, fast, scarlet)
def hit1():
    names = []
    heads = [60, 120, 175, 196, 196]
    for k, hd in enumerate(heads):
        tail = max(-18, hd - 150)
        er = 0.0 if k < 3 else (0.35 if k == 3 else 0.7)
        I = arc_field(N, 64, 84, 58, 22, D(tail), D(hd), seed=k, erode=er, squash=0.9)
        I = np.maximum(I, streaks(N, 64, 84, 58, D(tail), D(hd), 6, seed=10 + k, length=0.35) * (0.8 if k < 4 else 0.4))
        names.append(save(to_img(I, GRADE_SCARLET, N), f'hit1_{k}.png'))
    return names


# ------------------------------------------------------------------ 2타: 역사선 쌍월 (double crescent, blood spray)
def hit2():
    names = []
    heads = [125, 60, 5, -12, -12, -12]   # sweeps left -> right
    for k, hd in enumerate(heads):
        tail = min(200, hd + 160)
        er = [0, 0, 0, 0.25, 0.5, 0.75][k]
        I1 = arc_field(N, 64, 80, 58, 22, D(tail), D(hd), seed=k, erode=er)
        hd2 = hd + 28
        I2 = arc_field(N, 64, 80, 40, 12, D(min(200, hd2 + 120)), D(hd2), seed=k + 50, erode=min(0.9, er + 0.15)) * 0.85
        I = np.maximum(I1, I2)
        names.append(save(to_img(I, GRADE_BLOOD, N), f'hit2_{k}.png'))
    spray = []
    rng = np.random.default_rng(3)
    base = [(rng.uniform(-1, 1), rng.uniform(0.2, 1.0), rng.uniform(1.6, 3.6)) for _ in range(16)]
    for k in range(5):
        p = (k + 1) / 5
        pts = []
        for (dx, dy, r) in base:
            ang = math.atan2(-dy, dx * 0.6 + 0.8)
            dist = 14 + 46 * ease_out(p) * (0.6 + 0.4 * dy)
            x = 40 + math.cos(ang) * dist; y = 84 + math.sin(ang) * dist + 30 * p * p
            rad = r * (1 - 0.55 * p)
            pts.append((x, y, rad, 1.0 - 0.3 * p, -math.cos(ang) * 10 * (1 - p), -math.sin(ang) * 10 * (1 - p) - 4 * p))
        I = droplets(N, pts)
        spray.append(save(to_img(I, GRADE_BLOOD, N), f'hit2_spray_{k}.png'))
    return names, spray


# ------------------------------------------------------------------ 3타: 내려찍기 (massive dark crescent + ground burst)
def hit3():
    names = []
    heads = [75, 10, -45, -62, -62, -62]   # top -> down along right side
    for k, hd in enumerate(heads):
        tail = min(118, hd + 170)
        er = [0, 0, 0, 0.15, 0.45, 0.75][k]
        I = arc_field(N, 34, 58, 62, 30, D(tail), D(hd), seed=k, erode=er, inner_soft=0.45)
        I = np.maximum(I, streaks(N, 34, 58, 62, D(tail), D(hd), 9, seed=30 + k, length=0.3, width=1.6) * (0.9 if k < 4 else 0.3))
        names.append(save(to_img(I, GRADE_DARK, N), f'hit3_{k}.png'))
    # charge orb at blade (anticipation)
    charge = []
    for k in range(4):
        p = (k + 1) / 4
        I = ring(N, 64, 64, 40 * (1 - p) + 10, 3 + 3 * p, 0.7)
        I = np.maximum(I, ring(N, 64, 64, 0, 8 + 10 * p, 1.0))
        x, y = grid(N)
        th = np.arctan2(y - 64, x - 64)
        I = np.maximum(I, ring(N, 64, 64, 30 * (1 - p) + 14, 2, 0.6) * (np.sin(th * 6 + k) > 0.3))
        charge.append(save(to_img(I, GRADE_BLOOD, N), f'hit3_charge_{k}.png'))
    # impact flash (white-hot star)
    flash = []
    for k in range(3):
        x, y = grid(N)
        dx, dy = x - 64, y - 64
        r = np.hypot(dx, dy); th = np.arctan2(dy, dx)
        star = np.clip(1 - r / (56 * (1 - 0.25 * k) * (0.25 + 0.75 * np.abs(np.cos(th * 2)) ** 8)), 0, 1)
        core = np.clip(1 - r / (26 - 6 * k), 0, 1)
        I = np.maximum(star ** 0.6 * (1 - 0.3 * k), core ** 0.4)
        flash.append(save(to_img(I, GRADE_SCARLET, N), f'hit3_flash_{k}.png'))
    # ground blood splat (flat decal)
    splat = []
    rng = np.random.default_rng(9)
    lobes = [(rng.uniform(0, 6.28), rng.uniform(0.6, 1.0), rng.uniform(1.5, 3.5)) for _ in range(9)]
    drops = [(rng.uniform(0, 6.28), rng.uniform(0.55, 0.95), rng.uniform(1.5, 4)) for _ in range(22)]
    for k in range(6):
        p = min(1, (k + 1) / 3)
        x, y = grid(N)
        dx, dy = x - 64, y - 64
        r = np.hypot(dx, dy); th = np.arctan2(dy, dx)
        rad = 22 * p * (1 + 0.18 * np.sin(th * 5 + 1) + 0.1 * np.sin(th * 11))
        for (a, l, wv) in lobes:
            rad = rad + 26 * p * l * np.exp(-((ang_diff(th, a)) * wv) ** 2) * 0.6
        I = np.clip(1 - r / np.maximum(rad, 1e-3), 0, 1) ** 0.35 * 0.75
        pts = [(64 + math.cos(a) * 60 * d * p, 64 + math.sin(a) * 60 * d * p, s * (0.6 + 0.4 * p), 0.6, 0, 0) for (a, d, s) in drops]
        I = np.maximum(I, droplets(N, pts) * 0.7)
        if k >= 3:
            nz = blob_noise(I.shape, np.random.default_rng(k), 10)
            I = np.where(nz < (k - 2) * 0.22, 0, I * (1 - (k - 2) * 0.12))
        # glossy highlight
        I = np.where((I > 0.6) & (np.sin(dx * 0.3 + dy * 0.2) > 0.92), 0.95, I)
        splat.append(save(to_img(I, GRADE_DARK, N), f'hit3_splat_{k}.png'))
    # shockwave ring (flat)
    wave = []
    for k in range(5):
        p = (k + 1) / 5
        I = ring(N, 64, 64, 18 + 42 * p, 9 * (1 - p) + 2, 1 - 0.5 * p, broken=0.15 * k, seed=k)
        wave.append(save(to_img(I, GRADE_BLOOD, N), f'hit3_wave_{k}.png'))
    # blood thorns erupting (vertical billboard, base at bottom of image)
    thorns = []
    spec = [(64, 1.0, 34, 0), (38, 0.7, 24, -6), (90, 0.75, 26, 7), (22, 0.45, 18, -9), (108, 0.5, 18, 9)]
    for k, g in enumerate([0.35, 0.8, 1.0, 1.0, 0.85]):
        I = np.zeros((N * SS, N * SS))
        for (bx, h, w, lean) in spec:
            I = np.maximum(I, spike(N, bx, 124, 118 * h * g, w, lean / 40))
        if k >= 3:
            nz = blob_noise(I.shape, np.random.default_rng(40 + k), 8)
            I = np.where(nz < (k - 2) * 0.3, 0, I)
        thorns.append(save(to_img(I * 0.92, GRADE_DARK, N), f'hit3_thorns_{k}.png'))
    return names, charge, flash, splat, wave, thorns


def build():
    os.makedirs(OUT, exist_ok=True)
    h1 = hit1()
    h2, spray = hit2()
    h3, charge, flash, splat, wave, thorns = hit3()
    tracks = [
        # ---------------- 1타 (tick 0-6): 얇고 빠른 가로 베기, 오른쪽 -> 왼쪽
        {"id": "hit1_slash", "frames": [h1[0], h1[1], h1[2], h1[2], h1[3], h1[3], h1[4]], "ticks_per_frame": 1, "start_tick": 0, "end_tick": 6,
         "size": [3.2, 3.2], "billboard": "fixed",
         "keys": [{"tick": 0, "translation": [0, 1.2, -0.7], "rotation": [-50, 0, 6], "scale": [0.9, 0.9, 1]},
                  {"tick": 6, "translation": [0, 1.15, -0.9], "rotation": [-50, 0, 10], "scale": [1.08, 1.08, 1]}]},
        # ---------------- 2타 (tick 9-17): 아래-왼쪽에서 위-오른쪽으로 올려베는 쌍월 + 피 분사
        {"id": "hit2_slash", "frames": h2, "ticks_per_frame": 1, "start_tick": 9, "end_tick": 15,
         "size": [3.6, 3.6], "billboard": "fixed",
         "keys": [{"tick": 0, "translation": [0.1, 1.25, -1.0], "rotation": [-38, 0, 32], "scale": [0.9, 0.9, 1]},
                  {"tick": 6, "translation": [0.2, 1.35, -1.2], "rotation": [-38, 0, 38], "scale": [1.12, 1.12, 1]}]},
        {"id": "hit2_spray", "frames": spray, "ticks_per_frame": 1, "start_tick": 11, "end_tick": 16,
         "size": [2.4, 2.4], "billboard": "center",
         "keys": [{"tick": 0, "translation": [0.5, 1.5, -1.4], "scale": [1, 1, 1]},
                  {"tick": 5, "translation": [0.8, 1.4, -1.6], "scale": [1.2, 1.2, 1]}]},
        # ---------------- 3타 (tick 19-45): 낫을 머리 위로 들어(차지) 지면에 내려찍기
        {"id": "hit3_charge", "frames": charge, "ticks_per_frame": 1, "start_tick": 19, "end_tick": 23,
         "size": [1.4, 1.4], "billboard": "center",
         "keys": [{"tick": 0, "translation": [0.35, 2.9, 0.1], "scale": [1, 1, 1]},
                  {"tick": 4, "translation": [0.35, 3.0, 0.0], "scale": [0.8, 0.8, 1]}]},
        {"id": "hit3_slash", "frames": h3 + [h3[-3], h3[-2], h3[-1]], "ticks_per_frame": 1, "start_tick": 24, "end_tick": 32,
         "size": [4.6, 4.6], "billboard": "fixed",
         "keys": [{"tick": 0, "translation": [0.54, 1.95, -2.0], "rotation": [0, 60, 0], "scale": [1, 1, 1]},
                  {"tick": 3, "translation": [0.54, 1.85, -2.04], "rotation": [0, 60, 0], "scale": [1, 1, 1]},
                  {"tick": 8, "translation": [0.54, 1.8, -2.06], "rotation": [0, 60, 0], "scale": [1.04, 1.04, 1]}]},
        {"id": "hit3_flash", "frames": flash, "ticks_per_frame": 1, "start_tick": 27, "end_tick": 29,
         "size": [2.8, 2.8], "billboard": "center",
         "keys": [{"tick": 0, "translation": [0.5, 0.5, -2.0], "scale": [0.8, 0.8, 1]},
                  {"tick": 2, "translation": [0.5, 0.6, -2.0], "scale": [1.3, 1.3, 1]}]},
        {"id": "hit3_splat", "frames": splat, "ticks_per_frame": 3, "start_tick": 27, "end_tick": 45,
         "size": [4.5, 4.5], "billboard": "fixed",
         "keys": [{"tick": 0, "translation": [0.5, 0.03, -2.0], "rotation": [-90, 0, 0], "scale": [0.8, 0.8, 1]},
                  {"tick": 6, "translation": [0.5, 0.03, -2.0], "rotation": [-90, 0, 0], "scale": [1, 1, 1]}]},
        {"id": "hit3_wave", "frames": wave, "ticks_per_frame": 2, "start_tick": 27, "end_tick": 36,
         "size": [5, 5], "billboard": "fixed",
         "keys": [{"tick": 0, "translation": [0.5, 0.08, -2.0], "rotation": [-90, 0, 0], "scale": [0.6, 0.6, 1]},
                  {"tick": 9, "translation": [0.5, 0.08, -2.0], "rotation": [-90, 0, 0], "scale": [1.5, 1.5, 1]}]},
        {"id": "hit3_thorns", "frames": thorns, "ticks_per_frame": 2, "start_tick": 28, "end_tick": 40,
         "size": [3.2, 3.2], "billboard": "vertical",
         "keys": [{"tick": 0, "translation": [0.5, 1.6, -2.3], "scale": [1, 1, 1]},
                  {"tick": 12, "translation": [0.5, 1.5, -2.3], "scale": [1, 1, 1]}]},
    ]
    player = [
        {"tick": 0, "arm_r": [-95, 60, 0], "arm_l": [-40, 20, 0], "body": [0, 35, 0]},
        {"tick": 4, "arm_r": [-90, -70, 0], "arm_l": [-50, -30, 0], "body": [0, -35, 0]},
        {"tick": 8, "arm_r": [-25, -45, 25], "arm_l": [-20, -20, 0], "body": [0, -30, 0], "head": [0, -10, 0]},
        {"tick": 13, "arm_r": [-165, 45, -25], "arm_l": [-110, 30, 0], "body": [-8, 30, 0], "head": [-10, 10, 0]},
        {"tick": 19, "arm_r": [-175, 0, 0], "arm_l": [-170, 0, 0], "body": [-12, 0, 0], "head": [-15, 0, 0]},
        {"tick": 24, "arm_r": [-180, 0, 0], "arm_l": [-178, 0, 0], "body": [-15, 0, 0], "head": [-15, 0, 0]},
        {"tick": 27, "arm_r": [-35, 0, 0], "arm_l": [-40, 0, 0], "body": [28, 0, 0], "head": [10, 0, 0]},
        {"tick": 36, "arm_r": [-30, 0, 0], "arm_l": [-35, 0, 0], "body": [24, 0, 0], "head": [8, 0, 0]},
        {"tick": 46, "arm_r": [0, 0, 0], "arm_l": [0, 0, 0], "body": [0, 0, 0], "head": [0, 0, 0]},
    ]
    tl = {"name": "피의 군주 기본 공격 3연타 — 1타 가로베기, 2타 쌍월 올려베기와 피 분사, 3타 내려찍기 후 지면 폭혈과 가시",
          "duration_ticks": 46, "tracks": tracks, "player": player}
    with open(os.path.join(OUT, 'timeline.json'), 'w') as f:
        json.dump(tl, f, ensure_ascii=False, indent=2)
    return tl


if __name__ == '__main__':
    tl = build()
    frames = [preview_tick(tl, OUT, t, size=300) for t in [2, 4, 11, 13, 21, 25, 28, 31, 36]]
    sheet(frames, 3).save(os.path.join(PREV, 'basic_attack.png'))
    # contact sheet of raw sprites
    files = sorted(f for f in os.listdir(OUT) if f.endswith('.png'))
    ims = []
    for fn in files:
        bg = Image.new('RGBA', (N, N), (30, 30, 36, 255)); bg.alpha_composite(Image.open(os.path.join(OUT, fn)))
        ims.append(bg)
    sheet(ims, 10).save(os.path.join(PREV, 'basic_attack_sprites.png'))
    print(len(files), 'sprites')
