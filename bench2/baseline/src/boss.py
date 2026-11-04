"""보스: 골수왕 상귀스 (Sanguis, the Marrow King) — 피의 늪의 뼈 거인. 약 2.7배 크기(높이 ~86px)."""
import math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from bb import Model, hexc, render, sheet

OUT = os.path.join(os.path.dirname(__file__), '..')
SOCK = hexc('#120204'); EYE = hexc('#ff3a3a'); EYE2 = hexc('#ffd8c8'); BD = hexc('#6b5a45'); BDD = hexc('#3a2e22')


def skull_face(t):
    h, w = t.shape[:2]   # 14 x 12
    t[:, :] = t[:, :]
    # brow ridge
    t[3, 1:w - 1] = BD
    # eye sockets 4x3 each with glowing pupils
    for cx in (3, w - 5):
        t[4:7, cx - 1:cx + 3] = SOCK
        t[5, cx] = EYE; t[5, cx + 1] = EYE; t[4, cx] = EYE2
    # nasal cavity
    t[7:9, w // 2 - 1:w // 2 + 1] = SOCK
    t[9, w // 2 - 1:w // 2 + 1] = BD
    # cheek cracks
    t[8, 2] = BDD; t[9, 3] = BDD; t[7, w - 3] = BDD
    # upper teeth row
    for x in range(2, w - 2):
        t[h - 2, x] = hexc('#f3ead2') if x % 2 == 0 else SOCK
    t[h - 1, 2:w - 2] = BDD
    # blood trail from left eye
    t[7:11, 3] = hexc('#8f101d'); t[11, 3] = hexc('#c01b2a')


def jaw_front(t):
    h, w = t.shape[:2]
    for x in range(1, w - 1):
        t[0, x] = hexc('#f3ead2') if x % 2 else SOCK
    t[1, :] = BD


def heart_front(t):
    h, w = t.shape[:2]
    t[:, :] = hexc('#c01b2a')
    t[1:-1, 1:-1] = hexc('#ff5a4a')
    t[2:-2, 2:-2] = hexc('#ffb0a0')
    t[h // 2, w // 2] = hexc('#fff0e8')
    t[0, 0] = t[0, -1] = t[-1, 0] = t[-1, -1] = hexc('#660a14')


def rib_front(t):
    h, w = t.shape[:2]
    t[0, :] = hexc('#f3ead2'); t[-1, :] = hexc('#6b5a45')


def cape_back(t):
    h, w = t.shape[:2]
    rng = np.random.default_rng(3)
    # tattered bottom: transparent notches
    for x in range(w):
        cut = int(rng.integers(0, 7)) if x % 3 else int(rng.integers(3, 10))
        t[h - cut:, x] = 0
        if h - cut - 1 >= 0:
            t[h - cut - 1, x] = hexc('#1c0306')
    # sigil stripe
    for y in range(4, h - 12, 3):
        t[y, w // 2] = hexc('#8f101d')
    t[6:9, w // 2 - 2:w // 2 + 3] = hexc('#660a14')


def build():
    m = Model('sanguis_marrow_king', seed=77)
    m.group('root', [0, 0, 0])
    m.group('hips', [0, 32, 0], parent='root')
    m.group('body', [0, 36, 0], parent='hips')
    m.group('heart', [0, 52, -7], parent='body')
    m.group('head', [0, 64, -3], parent='body')
    m.group('jaw', [0, 64, -4], parent='head')
    m.group('arm_r', [19, 60, 0], parent='body')     # entity right (+X): bone-scythe arm
    m.group('forearm_r', [19, 42, 0], parent='arm_r')
    m.group('arm_l', [-19, 60, 0], parent='body')    # entity left (-X): claw arm
    m.group('forearm_l', [-19, 42, 0], parent='arm_l')
    m.group('cape', [0, 62, 9], parent='body')
    m.group('leg_r', [7, 32, 0], parent='root')
    m.group('leg_l', [-7, 32, 0], parent='root')

    # ---------- legs (obsidian greaves, iron sabatons, bone knee spikes)
    for side, sx in (('leg_r', 1), ('leg_l', -1)):
        x0 = 3 if sx > 0 else -11
        m.cube(side + '_thigh', [x0, 16, -4.5], [x0 + 8, 32, 4.5], side, 'skin')
        m.cube(side + '_thighplate', [x0 - 0.5, 20, -5], [x0 + 8.5, 31, -3], side, 'iron_red')
        m.cube(side + '_greave', [x0 - 0.5, 4, -5], [x0 + 8.5, 17, 4.5], side, 'obsidian')
        m.cube(side + '_knee', [x0 + 1.5, 14, -6.5], [x0 + 6.5, 19, -4], side, 'bone')
        m.cube(side + '_kneespike', [x0 + 3, 17, -8], [x0 + 5, 22, -6], side, 'bone', rotation=[-30, 0, 0], origin=[x0 + 4, 17, -6])
        m.cube(side + '_foot', [x0 - 1, 0, -9], [x0 + 9, 5, 5], side, 'iron')
        for i in range(3):
            fx = x0 + 0.5 + i * 3
            m.cube(side + f'_toe{i}', [fx, 0, -11], [fx + 2, 2, -9], side, 'bone')

    # ---------- pelvis & loincloth
    m.cube('pelvis', [-12, 28, -6.5], [12, 36, 6.5], 'hips', 'iron_red')
    m.cube('belt', [-12.5, 33, -7], [12.5, 35, 7], 'hips', 'leather')
    m.cube('belt_skull', [-2.5, 30.5, -8.5], [2.5, 35.5, -6.5], 'hips', 'bone', decals={'north': jaw_front})
    m.cube('loin_front', [-6, 12, -7.5], [6, 30, -6.5], 'hips', 'cloth')
    m.cube('loin_back', [-7, 14, 6.5], [7, 30, 7.5], 'hips', 'cloth')

    # ---------- torso: exposed spine, ribcage, blood heart
    m.cube('spine', [-3, 34, -1], [3, 46, 4], 'body', 'bone')
    m.cube('gut', [-9, 36, -5], [9, 44, 5], 'body', 'skin')
    m.cube('chest', [-14, 44, -7], [14, 62, 8], 'body', 'skin')
    m.cube('heart', [-4, 48, -9], [4, 56, -7], 'heart', 'glow', decals={'north': heart_front})
    m.cube('heart_veins', [-6, 46, -8], [6, 58, -7.25], 'heart', 'blood')
    for i in range(5):
        y = 44.5 + i * 3.4
        half = 14.5 - abs(i - 2) * 1.2
        m.cube(f'rib_l{i}', [-half, y, -8.5], [-4.5, y + 1.6, -6.5], 'body', 'bone', decals={'north': rib_front})
        m.cube(f'rib_r{i}', [4.5, y, -8.5], [half, y + 1.6, -6.5], 'body', 'bone', decals={'north': rib_front})
    m.cube('sternum', [-1, 44, -8.75], [1, 60, -7], 'body', 'bone')
    m.cube('collar', [-15, 58, -8], [15, 63, 9], 'body', 'iron')
    # pauldrons with bone spikes
    for sx in (1, -1):
        x0 = 13 if sx > 0 else -25
        n = 'r' if sx > 0 else 'l'
        m.cube(f'pauldron_{n}', [x0, 56, -8], [x0 + 12, 66, 8], 'body', 'obsidian')
        m.cube(f'pauldron_{n}_rim', [x0 - 0.5, 55, -8.5], [x0 + 12.5, 57, 8.5], 'body', 'iron_red')
        for j, (z, h) in enumerate([(-5, 9), (0, 12), (5, 8)]):
            cx = x0 + 6
            m.cube(f'pspike_{n}{j}', [cx - 1.5, 66, z - 1.5], [cx + 1.5, 66 + h, z + 1.5], 'body', 'bone',
                   rotation=[0, 0, -18 * sx], origin=[cx, 66, z])
    # ---------- cape
    m.cube('cape', [-14, 12, 8.5], [14, 62, 10], 'cape', 'cloth', decals={'south': cape_back, 'north_mat': 'cloth'})

    # ---------- head: giant skull with bone crown and curling horns
    m.cube('skull', [-7, 63, -15], [7, 77, -1], 'head', 'bone', decals={'north': skull_face})
    m.cube('skull_back', [-6, 64, -2], [6, 75, 2], 'head', 'bone')
    m.cube('jaw', [-6, 59, -14.5], [6, 63, -3], 'jaw', 'bone', decals={'north': jaw_front})
    m.cube('jaw_tusk_l', [-6, 61, -15.5], [-4, 66, -13.5], 'jaw', 'bone')
    m.cube('jaw_tusk_r', [4, 61, -15.5], [6, 66, -13.5], 'jaw', 'bone')
    m.cube('crown_band', [-7.5, 73, -15.5], [7.5, 75, -0.5], 'head', 'iron_red')
    for i, x in enumerate([-6, -3, 0, 3, 6]):
        h = [4, 6, 9, 6, 4][i]
        m.cube(f'crown{i}', [x - 1, 75, -15.5], [x + 1, 75 + h, -13.5], 'head', 'bone' if i != 2 else 'glow')
    # horns: four-segment curls sweeping out from the temples, then up and inward
    for sx in (1, -1):
        n = 'r' if sx > 0 else 'l'
        px, py = 6.0 * sx, 71.0
        for j, (L, th, ang) in enumerate([(6, 4.0, 15), (5, 3.4, 45), (5, 2.8, 78), (4, 2.2, 112)]):
            x_lo, x_hi = (px - 0.8, px + L) if sx > 0 else (px - L, px + 0.8)
            m.cube(f'horn_{n}{j}', [x_lo, py - th / 2, -9 - th / 2], [x_hi, py + th / 2, -9 + th / 2], 'head', 'bone',
                   rotation=[0, 0, ang * sx], origin=[px, py, -9])
            a = math.radians(ang)
            px, py = px + math.cos(a) * L * sx, py + math.sin(a) * L
        m.cube(f'horn_{n}_tip', [px - 0.75, py - 0.75, -9.75], [px + 0.75, py + 0.75, -8.25], 'head', 'glow')

    # ---------- right arm: bone-scythe arm
    m.cube('uarm_r', [15, 42, -5], [23, 60, 5], 'arm_r', 'skin')
    m.cube('uarm_r_band', [14.5, 46, -5.5], [23.5, 49, 5.5], 'arm_r', 'leather')
    m.cube('farm_r', [14, 26, -5.5], [24, 43, 5.5], 'forearm_r', 'iron_red')
    m.cube('farm_r_bone', [15, 24, -6.5], [23, 28, 6.5], 'forearm_r', 'bone')
    m.cube('fist_r', [15, 18, -5], [23, 26, 5], 'forearm_r', 'skin')
    # haft through the fist, blade at the end (points forward -Z and curves down)
    m.cube('haft_r', [18, 22, -30], [20, 25, 8], 'forearm_r', 'obsidian')
    m.cube('haft_r_cap', [17.5, 19.5, 8], [20.5, 23.5, 10], 'forearm_r', 'iron')
    y, z = 25.2, -29.0   # blade hangs from the haft tip, curving back toward the boss (+Z): edge on the inner side
    for j, (L, wid, phi) in enumerate([(8, 9, 0), (7, 8, 16), (6, 6, 34), (5, 4.5, 54), (4, 3, 76)]):
        m.cube(f'blade_r{j}', [18.5, y - L - 0.5, z - 1], [19.5, y, z + wid - 1], 'forearm_r', 'iron_red',
               rotation=[-phi, 0, 0] if phi else None, origin=[19, y, z],
               decals={'north_mat': 'iron', 'south_mat': 'glow', 'down_mat': 'glow'})
        a = math.radians(phi)
        y, z = y - math.cos(a) * L, z + math.sin(a) * L
    m.cube('blade_root', [17.5, 20, -31.5], [20.5, 26, -27.5], 'forearm_r', 'bone')
    m.cube('blade_root_gem', [17.25, 22, -30.5], [20.75, 24, -28.5], 'forearm_r', 'glow')

    # ---------- left arm: obsidian claw
    m.cube('uarm_l', [-23, 42, -5], [-15, 60, 5], 'arm_l', 'skin')
    m.cube('uarm_l_chain', [-23.5, 50, -5.5], [-14.5, 52, 5.5], 'arm_l', 'iron')
    m.cube('farm_l', [-24, 26, -6], [-14, 43, 6], 'forearm_l', 'obsidian')
    m.cube('farm_l_spike', [-26, 34, -1], [-23, 38, 2], 'forearm_l', 'bone', rotation=[0, 0, 30], origin=[-24, 36, 0])
    m.cube('hand_l', [-23, 20, -5], [-15, 26, 5], 'forearm_l', 'skin')
    for i, z in enumerate([-4, -0.5, 3]):
        m.cube(f'claw_l{i}', [-22.5 + i * 2.5, 11, z - 1], [-20.5 + i * 2.5, 21, z + 1], 'forearm_l', 'bone',
               rotation=[-15, 0, 0], origin=[-21.5 + i * 2.5, 21, z])
        m.cube(f'claw_tip{i}', [-22.25 + i * 2.5, 9, z - 1.75], [-20.75 + i * 2.5, 11, z - 0.25], 'forearm_l', 'glow',
               rotation=[-15, 0, 0], origin=[-21.5 + i * 2.5, 21, z])
    # blood drips
    m.cube('drip_heart', [-0.5, 44, -8.6], [0.5, 48, -8.1], 'heart', 'glow')
    m.cube('drip_jaw', [2.5, 55, -14], [3.25, 59, -13.25], 'jaw', 'glow')

    # ---------------- animations
    m.anim('idle', 3.0, {
        'body': {'rotation': [(0, [0, 0, 0]), (1.5, [3, 0, 0]), (3.0, [0, 0, 0])]},
        'head': {'rotation': [(0, [0, 0, 0]), (1.0, [-4, 6, 0]), (2.0, [2, -6, 0]), (3.0, [0, 0, 0])]},
        'jaw': {'rotation': [(0, [0, 0, 0]), (1.4, [0, 0, 0]), (1.7, [14, 0, 0]), (2.2, [0, 0, 0]), (3.0, [0, 0, 0])]},
        'arm_r': {'rotation': [(0, [0, 0, 4]), (1.5, [-4, 0, 6]), (3.0, [0, 0, 4])]},
        'arm_l': {'rotation': [(0, [0, 0, -4]), (1.5, [4, 0, -6]), (3.0, [0, 0, -4])]},
        'heart': {'scale': [(0, [1, 1, 1]), (0.15, [1.18, 1.18, 1.3]), (0.35, [1, 1, 1]), (0.5, [1.12, 1.12, 1.2]), (0.8, [1, 1, 1]), (3.0, [1, 1, 1])]},
        'cape': {'rotation': [(0, [4, 0, 0]), (1.5, [8, 0, 2]), (3.0, [4, 0, 0])]},
    })
    s = 24
    m.anim('walk', 1.6, {
        'leg_r': {'rotation': [(0, [s, 0, 0]), (0.8, [-s, 0, 0]), (1.6, [s, 0, 0])]},
        'leg_l': {'rotation': [(0, [-s, 0, 0]), (0.8, [s, 0, 0]), (1.6, [-s, 0, 0])]},
        'arm_r': {'rotation': [(0, [-14, 0, 4]), (0.8, [12, 0, 4]), (1.6, [-14, 0, 4])]},
        'arm_l': {'rotation': [(0, [14, 0, -4]), (0.8, [-12, 0, -4]), (1.6, [14, 0, -4])]},
        'hips': {'position': [(0, [0, 0, 0]), (0.4, [0, -1.5, 0]), (0.8, [0, 0, 0]), (1.2, [0, -1.5, 0]), (1.6, [0, 0, 0])],
                 'rotation': [(0, [0, 6, 0]), (0.8, [0, -6, 0]), (1.6, [0, 6, 0])]},
        'body': {'rotation': [(0, [5, -4, 3]), (0.8, [5, 4, -3]), (1.6, [5, -4, 3])]},
        'head': {'rotation': [(0, [-3, 0, 0]), (0.4, [3, 0, 0]), (0.8, [-3, 0, 0]), (1.2, [3, 0, 0]), (1.6, [-3, 0, 0])]},
        'cape': {'rotation': [(0, [10, 0, 0]), (0.4, [16, 0, 0]), (0.8, [10, 0, 0]), (1.2, [16, 0, 0]), (1.6, [10, 0, 0])]},
    })
    m.anim('attack', 2.0, {
        # wind-up (0-0.8): rear back, scythe arm overhead; slam (0.8-1.0); hold; recover
        'arm_r': {'rotation': [(0, [0, 0, 0]), (0.8, [-160, 0, -10]), (0.95, [-170, 0, -10]), (1.1, [-35, 0, 0]), (1.5, [-30, 0, 0]), (2.0, [0, 0, 0])]},
        'forearm_r': {'rotation': [(0, [0, 0, 0]), (0.8, [-30, 0, 0]), (1.1, [-10, 0, 0]), (2.0, [0, 0, 0])]},
        'arm_l': {'rotation': [(0, [0, 0, 0]), (0.8, [-40, 0, -25]), (1.1, [-20, 0, -10]), (2.0, [0, 0, 0])]},
        'body': {'rotation': [(0, [0, 0, 0]), (0.8, [-14, 10, 0]), (1.1, [22, -6, 0]), (1.5, [20, -4, 0]), (2.0, [0, 0, 0])]},
        'head': {'rotation': [(0, [0, 0, 0]), (0.8, [-12, 0, 0]), (1.1, [10, 0, 0]), (2.0, [0, 0, 0])]},
        'jaw': {'rotation': [(0, [0, 0, 0]), (0.8, [22, 0, 0]), (1.1, [8, 0, 0]), (2.0, [0, 0, 0])]},
        'hips': {'position': [(0, [0, 0, 0]), (0.8, [0, 0, 1.5]), (1.1, [0, -3, -3]), (1.5, [0, -3, -3]), (2.0, [0, 0, 0])]},
        'heart': {'scale': [(0, [1, 1, 1]), (0.8, [1.3, 1.3, 1.4]), (1.1, [1, 1, 1]), (2.0, [1, 1, 1])]},
        'cape': {'rotation': [(0, [4, 0, 0]), (0.8, [0, 0, 0]), (1.1, [30, 0, 0]), (2.0, [4, 0, 0])]},
    }, loop='once')
    m.build_texture()
    return m


if __name__ == '__main__':
    m = build()
    d = m.save(os.path.join(OUT, 'boss', 'boss.bbmodel'), 'boss.png')
    vs = [render(d, yaw=y, pitch=p, size=320) for y, p in [(-30, 12), (30, 12), (-90, 0), (160, 15)]]
    vs += [render(d, yaw=-60, pitch=8, size=320, anim='walk', t=t) for t in (0.0, 0.4)]
    vs += [render(d, yaw=-70, pitch=8, size=320, anim='attack', t=t) for t in (0.8, 1.15)]
    sheet(vs, 4).save(os.path.join(OUT, 'preview', 'boss.png'))
    print(m.W, m.H, len(m.elements))
