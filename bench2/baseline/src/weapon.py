"""피의 낫 (Blood Scythe) — 3D .bbmodel + 16x16 inventory icon."""
import math, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from bb import Model, hexc, render, sheet

OUT = os.path.join(os.path.dirname(__file__), '..')

EDGE = hexc('#ff4a4a'); EDGE2 = hexc('#ffb0a0'); SPINE = hexc('#16121a'); SPINE2 = hexc('#3b3541')
RUNE = hexc('#ff2a3a')


def blade_side(rows_top=1):
    def f(t):
        h, w = t.shape[:2]
        t[0, :] = SPINE2
        if h > 2:
            t[1, :] = SPINE
        t[-1, :] = EDGE
        if h > 3:
            for x in range(w):
                t[-2, x] = EDGE2 if x % 3 == 0 else hexc('#c01b2a')
        # blood groove (fuller) through middle
        if h >= 5:
            mid = h // 2 - 1
            t[mid, :] = hexc('#3d050c')
            for x in range(0, w, 3):
                t[mid, x] = RUNE
    return f


def build():
    m = Model('blood_scythe', seed=7)
    m.group('scythe', [0, 0, 0])
    m.group('head', [0, 30, 0], parent='scythe')
    m.group('blade', [0, 31, -2], parent='head')

    # ---- shaft (+Y), 2x2, grip at origin
    m.cube('shaft_low', [-1, -8, -1], [1, 12, 1], 'scythe', 'iron')
    m.cube('shaft_high', [-1, 13, -1], [1, 29, 1], 'scythe', 'iron')
    for i, y in enumerate([16, 20, 24]):
        m.cube(f'shaft_ring{i}', [-1, y, -1], [1, y + 1, 1], 'scythe', 'obsidian', inflate=0.2)
    # leather-wrapped grip around origin
    for i, y in enumerate(range(-4, 6, 2)):
        m.cube(f'grip_wrap{i}', [-1, y, -1], [1, y + 1.5, 1], 'scythe', 'leather', inflate=0.25)
    # collars
    m.cube('collar_mid', [-1.5, 12, -1.5], [1.5, 13.5, 1.5], 'scythe', 'iron')
    m.cube('collar_low', [-1.5, -8, -1.5], [1.5, -6.5, 1.5], 'scythe', 'iron')
    # pommel: blood gem + bone spike
    m.cube('pommel_gem', [-1, -10.5, -1], [1, -8, 1], 'scythe', 'glow')
    m.cube('pommel_cap', [-1.5, -11.5, -1.5], [1.5, -10.5, 1.5], 'scythe', 'iron')
    m.cube('pommel_spike', [-0.5, -14.5, -0.5], [0.5, -11.5, 0.5], 'scythe', 'bone')
    # blood channels down the shaft
    m.cube('shaft_vein', [-0.5, 14, -1.25], [0.5, 27, -0.75], 'scythe', 'glow')

    # ---- head: bone skull socket
    def skull_front(t):
        h, w = t.shape[:2]
        # eye sockets with glow
        t[1, 0] = hexc('#1c0306'); t[1, w - 1] = hexc('#1c0306')
        t[1, 1] = hexc('#ff3a3a'); t[1, w - 2] = hexc('#ff3a3a')
        t[h - 1, 1:w - 1] = hexc('#3a2e22')
        for x in range(1, w - 1, 2):
            t[h - 1, x] = hexc('#ddd0b0')
    m.cube('skull', [-2, 29, -2.5], [2, 33, 1.5], 'head', 'bone', decals={'north': skull_front})
    m.cube('skull_jaw', [-1.5, 28, -2.5], [1.5, 29, 1], 'head', 'bone')
    m.cube('head_band', [-2.25, 31, -2.75], [2.25, 31.75, 1.75], 'head', 'iron_red')
    # crown spikes on top of skull
    m.cube('crown_l', [-2, 33, -1], [-1, 35.5, 0], 'head', 'bone', rotation=[0, 0, 15], origin=[-1.5, 33, -0.5])
    m.cube('crown_r', [1, 33, -1], [2, 35.5, 0], 'head', 'bone', rotation=[0, 0, -15], origin=[1.5, 33, -0.5])
    m.cube('crown_m', [-0.5, 33, -0.5], [0.5, 36.5, 0.5], 'head', 'bone')
    # back hook spike (+Z), curved up
    m.cube('back_hook1', [-0.5, 30.5, 1.5], [0.5, 32, 7], 'head', 'iron', rotation=[-35, 0, 0], origin=[0, 31, 1.5])
    m.cube('back_hook2', [-0.5, 33.2, 5.6], [0.5, 34.4, 9], 'head', 'iron', rotation=[-70, 0, 0], origin=[0, 33.8, 5.6])
    m.cube('back_hook_tip', [-0.5, 33.4, 8.5], [0.5, 34.4, 10], 'head', 'glow', rotation=[-70, 0, 0], origin=[0, 33.8, 5.6])

    # ---- blade: arc of segments going -Z and curving down
    segs = [  # length, top, bottom, angle   (rises slightly, then hooks down)
        (5, 1.5, 7.0, 12), (5, 1.5, 6.5, 4), (5, 1.5, 6.0, -6), (5, 1.5, 5.0, -18),
        (5, 1.5, 4.0, -32), (4, 1.0, 3.0, -48), (4, 1.0, 2.0, -64), (3, 0.5, 1.0, -82)]
    p = np.array([31.0, -2.0])  # (y, z)
    for i, (L, top, bot, ang) in enumerate(segs):
        y, z = p
        el = m.cube(f'blade{i}', [-0.5, y - bot, z - L - 0.6], [0.5, y + top, z], 'blade', 'iron_red',
                    origin=[0, y, z], rotation=[ang, 0, 0] if ang else None,
                    decals={'east': blade_side(), 'west': blade_side(), 'up_mat': 'iron', 'down_mat': 'glow'})
        a = math.radians(ang)
        p = p + np.array([math.sin(a) * L, -math.cos(a) * L])  # direction (0,0,-1) rotated
    # blood drips hanging from the edge
    m.cube('drip1', [-0.25, 23.5, -10.5], [0.25, 26, -10], 'blade', 'glow')
    m.cube('drip2', [-0.25, 23.0, -18], [0.25, 25.5, -17.5], 'blade', 'glow')
    # small barb on the spine
    m.cube('spine_barb', [-0.5, 32, -10], [0.5, 34, -8], 'blade', 'iron', rotation=[-30, 0, 0], origin=[0, 32.5, -9])

    m.build_texture()
    return m


ICON_ROWS = [
    "................",
    "....KKKKKKK.....",
    "..KKDDDDDDDKK.K.",
    ".KDRRRRRRRRKBKMK",
    "KDRREEHEEERKBBK.",
    "KRERKKKKKKKBeBBK",
    "KEK.......KbBbK.",
    "KEK......KSbKK..",
    ".K......KSsK....",
    ".......KSsK.....",
    "......KLlK......",
    ".....KLlK.......",
    "....KLlK........",
    "...KSsK.........",
    "..KGgK..........",
    "..KKK...........",
]
ICON_PAL = {'K': '#0d0508', 'D': '#561722', 'R': '#a8202c', 'E': '#ff4a4a', 'H': '#ffc8b8',
            'B': '#e6dcc0', 'b': '#9c8a6c', 'e': '#ff2a2a', 'S': '#6a6274', 's': '#2a2530',
            'L': '#8f4a33', 'l': '#4a2216', 'G': '#ff3a3a', 'g': '#7a0a14', 'M': '#857c8c'}


def grid_img(rows, pal):
    img = Image.new('RGBA', (len(rows[0]), len(rows)), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in pal:
                img.putpixel((x, y), hexc(pal[ch]))
    return img


def icon():
    return grid_img(ICON_ROWS, ICON_PAL)


if __name__ == '__main__':
    m = build()
    d = m.save(os.path.join(OUT, 'weapon', 'blood_scythe.bbmodel'), 'blood_scythe.png')
    ic = icon()
    ic.save(os.path.join(OUT, 'weapon', 'blood_scythe.png'))
    views = [render(d, yaw=y, pitch=p, size=360) for y, p in [(-90, 0), (-50, 20), (90, 10), (0, 15)]]
    big = ic.resize((360, 360), Image.NEAREST)
    sheet(views + [big], 5).save(os.path.join(OUT, 'preview', 'weapon.png'))
    print('atlas', m.W, m.H, 'elements', len(m.elements))
