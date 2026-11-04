"""펫: 뼈가면 혈견 '루비' (Bonemask Blood Pup)."""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from bb import Model, hexc, render, sheet

OUT = os.path.join(os.path.dirname(__file__), '..')
EYE = hexc('#ff3a3a'); EYE2 = hexc('#ffd0c0'); SOCK = hexc('#1c0306'); BONE_D = hexc('#6b5a45')


def mask_front(t):
    h, w = t.shape[:2]          # 7 x 5
    for x in (1, w - 2):
        t[1, x] = SOCK; t[2, x] = SOCK
    t[1, 1] = EYE; t[1, w - 2] = EYE
    t[2, 1] = hexc('#8f101d'); t[2, w - 2] = hexc('#8f101d')
    t[0, w // 2] = hexc('#c01b2a')   # blood mark on brow
    t[1, w // 2] = hexc('#8f101d')
    t[h - 1, :] = BONE_D


def snout_front(t):
    h, w = t.shape[:2]          # 3 x 3
    t[0, :] = hexc('#ddd0b0')
    t[1, 1] = SOCK               # nasal hole
    t[h - 1, :] = hexc('#f3ead2')
    t[h - 1, 1] = BONE_D


def teeth(t):
    h, w = t.shape[:2]
    t[0, :] = [hexc('#f3ead2') if x % 2 == 0 else hexc('#3d050c') for x in range(w)]


def eye_east(t):
    t[1, -1] = EYE; t[1, -2] = SOCK


def eye_west(t):
    t[1, 0] = EYE; t[1, 1] = SOCK


def build():
    m = Model('bonemask_blood_pup', seed=21)
    m.group('root', [0, 0, 0])
    m.group('body', [0, 7, 0], parent='root')
    m.group('head', [0, 8.5, -5], parent='body')
    m.group('jaw', [0, 6.5, -9], parent='head')
    m.group('ear_l', [2.5, 11, -6.5], parent='head')
    m.group('ear_r', [-2.5, 11, -6.5], parent='head')
    m.group('tail', [0, 8.5, 5], parent='body')
    m.group('tail_tip', [0, 8.5, 10], parent='tail')
    for n, x, z in [('leg_fl', 2, -3), ('leg_fr', -2, -3), ('leg_bl', 2, 3.5), ('leg_br', -2, 3.5)]:
        m.group(n, [x, 5, z], parent='body')

    # torso
    m.cube('torso', [-3, 4, -5], [3, 9, 5], 'body', 'fur')
    m.cube('chest_ruff', [-3.5, 4, -5.5], [3.5, 9.5, -2], 'body', 'fur')
    m.cube('belly', [-2.5, 3.5, -3], [2.5, 4.5, 3], 'body', 'cloth')
    m.cube('collar', [-3.75, 7.5, -5.75], [3.75, 8.5, -3.5], 'body', 'iron_red')
    m.cube('collar_gem', [-0.75, 6.5, -6.0], [0.75, 8.0, -5.5], 'body', 'glow')
    # blood crystal ridge on the back
    for i, (z, h, r) in enumerate([(-3, 3.5, -15), (-0.5, 2.8, -20), (2, 2.2, -25), (4, 1.5, -30)]):
        m.cube(f'crystal{i}', [-0.75, 9, z - 0.75], [0.75, 9 + h, z + 0.75], 'body', 'glow',
               rotation=[r, 0, 0], origin=[0, 9, z])
    m.cube('spine_bone', [-0.5, 9, -4], [0.5, 9.5, 5], 'body', 'bone')

    # head with bone skull mask
    m.cube('head', [-3, 6, -10], [3, 11, -5], 'head', 'fur')
    m.cube('mask', [-3.25, 7, -10.5], [3.25, 11.5, -8.5], 'head', 'bone', decals={'north': mask_front, 'east': eye_east, 'west': eye_west})
    m.cube('snout', [-1.5, 6.5, -13], [1.5, 9, -10], 'head', 'bone', decals={'north': snout_front})
    m.cube('nose', [-0.5, 8.5, -13.25], [0.5, 9.25, -12.5], 'head', 'iron')
    m.cube('jaw', [-1.25, 5.5, -12.5], [1.25, 6.5, -9], 'jaw', 'fur', decals={'up': teeth})
    m.cube('fang_l', [0.5, 5.75, -12.6], [1.0, 7.0, -12.1], 'jaw', 'bone')
    m.cube('fang_r', [-1.0, 5.75, -12.6], [-0.5, 7.0, -12.1], 'jaw', 'bone')
    # little bone horns on the mask
    m.cube('horn_l', [1.5, 11.25, -10], [2.5, 13.75, -9], 'head', 'bone', rotation=[-20, 0, -20], origin=[2, 11.25, -9.5])
    m.cube('horn_r', [-2.5, 11.25, -10], [-1.5, 13.75, -9], 'head', 'bone', rotation=[-20, 0, 20], origin=[-2, 11.25, -9.5])
    # ears
    m.cube('ear_l', [1.75, 11, -7], [3.25, 13.5, -6], 'ear_l', 'fur', rotation=[0, 0, -15], origin=[2.5, 11, -6.5])
    m.cube('ear_r', [-3.25, 11, -7], [-1.75, 13.5, -6], 'ear_r', 'fur', rotation=[0, 0, 15], origin=[-2.5, 11, -6.5])

    # legs (2x5x2) with bone-claw paws
    for n, x, z in [('leg_fl', 2, -3), ('leg_fr', -2, -3), ('leg_bl', 2, 3.5), ('leg_br', -2, 3.5)]:
        m.cube(n, [x - 1, 1, z - 1], [x + 1, 6, z + 1], n, 'fur')
        m.cube(n + '_paw', [x - 1.25, 0, z - 1.5], [x + 1.25, 1.25, z + 1.25], n, 'iron')
        m.cube(n + '_claw', [x - 1, 0, z - 2], [x + 1, 0.75, z - 1.5], n, 'bone')

    # tail: fur + bone tip with blood drop
    m.cube('tail', [-0.75, 7.75, 5], [0.75, 9.25, 10.5], 'tail', 'fur')
    m.cube('tail_tip', [-1, 7.5, 10], [1, 9.5, 12.5], 'tail_tip', 'bone')
    m.cube('tail_gem', [-0.5, 9.5, 10.75], [0.5, 10.5, 11.75], 'tail_tip', 'glow')
    m.groups[[g['name'] for g in m.groups].index('tail')]['rotation'] = [-25, 0, 0]

    # ---------------- animations
    m.anim('idle', 2.0, {
        'body': {'position': [(0, [0, 0, 0]), (1.0, [0, -0.25, 0]), (2.0, [0, 0, 0])]},
        'head': {'rotation': [(0, [0, 0, 0]), (0.6, [-4, 6, 3]), (1.2, [2, -4, -2]), (2.0, [0, 0, 0])]},
        'jaw': {'rotation': [(0, [0, 0, 0]), (0.9, [0, 0, 0]), (1.1, [12, 0, 0]), (1.4, [0, 0, 0]), (2.0, [0, 0, 0])]},
        'tail': {'rotation': [(0, [0, -18, 0]), (0.5, [0, 18, 0]), (1.0, [0, -18, 0]), (1.5, [0, 18, 0]), (2.0, [0, -18, 0])]},
        'ear_l': {'rotation': [(0, [0, 0, 0]), (1.6, [0, 0, 0]), (1.75, [0, 0, -18]), (1.9, [0, 0, 0]), (2.0, [0, 0, 0])]},
        'ear_r': {'rotation': [(0, [0, 0, 0]), (1.6, [0, 0, 0]), (1.75, [0, 0, 18]), (1.9, [0, 0, 0]), (2.0, [0, 0, 0])]},
    })
    sw = 32
    m.anim('walk', 0.8, {
        'leg_fl': {'rotation': [(0, [sw, 0, 0]), (0.4, [-sw, 0, 0]), (0.8, [sw, 0, 0])]},
        'leg_br': {'rotation': [(0, [sw, 0, 0]), (0.4, [-sw, 0, 0]), (0.8, [sw, 0, 0])]},
        'leg_fr': {'rotation': [(0, [-sw, 0, 0]), (0.4, [sw, 0, 0]), (0.8, [-sw, 0, 0])]},
        'leg_bl': {'rotation': [(0, [-sw, 0, 0]), (0.4, [sw, 0, 0]), (0.8, [-sw, 0, 0])]},
        'body': {'position': [(0, [0, 0, 0]), (0.2, [0, 0.5, 0]), (0.4, [0, 0, 0]), (0.6, [0, 0.5, 0]), (0.8, [0, 0, 0])],
                 'rotation': [(0, [0, 0, 2]), (0.4, [0, 0, -2]), (0.8, [0, 0, 2])]},
        'head': {'rotation': [(0, [3, 0, 0]), (0.2, [-3, 0, 0]), (0.4, [3, 0, 0]), (0.6, [-3, 0, 0]), (0.8, [3, 0, 0])]},
        'tail': {'rotation': [(0, [0, -25, 0]), (0.2, [0, 25, 0]), (0.4, [0, -25, 0]), (0.6, [0, 25, 0]), (0.8, [0, -25, 0])]},
        'ear_l': {'rotation': [(0, [-10, 0, 0]), (0.4, [5, 0, 0]), (0.8, [-10, 0, 0])]},
        'ear_r': {'rotation': [(0, [-10, 0, 0]), (0.4, [5, 0, 0]), (0.8, [-10, 0, 0])]},
    })
    m.anim('attack', 0.6, {
        'head': {'rotation': [(0, [0, 0, 0]), (0.15, [-20, 0, 0]), (0.3, [15, 0, 0]), (0.6, [0, 0, 0])]},
        'jaw': {'rotation': [(0, [0, 0, 0]), (0.15, [35, 0, 0]), (0.3, [0, 0, 0]), (0.6, [0, 0, 0])]},
        'body': {'position': [(0, [0, 0, 0]), (0.15, [0, 0, 1.5]), (0.3, [0, 0, -2.5]), (0.6, [0, 0, 0])]},
    }, loop='once')
    m.build_texture()
    return m


if __name__ == '__main__':
    m = build()
    d = m.save(os.path.join(OUT, 'pet', 'pet.bbmodel'), 'pet.png')
    vs = [render(d, yaw=y, pitch=p, size=300) for y, p in [(-35, 20), (35, 15), (-90, 0), (160, 20)]]
    fit = None
    vs += [render(d, yaw=-90, pitch=0, size=300, anim='walk', t=t) for t in (0.0, 0.2, 0.4)]
    vs += [render(d, yaw=-35, pitch=20, size=300, anim='idle', t=1.75)]
    sheet(vs, 4).save(os.path.join(OUT, 'preview', 'pet.png'))
    print(m.W, m.H, len(m.elements))
