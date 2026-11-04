"""피의 군주 갑옷 풀세트: 64x32 layer1/layer2 + 16x16 icons (hand-authored pixel grids)."""
import os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from bb import hexc, png_data_url, render, sheet, uid

OUT = os.path.join(os.path.dirname(__file__), '..')

PAL = {
    'K': '#0d0508',  # outline / deep shadow
    'I': '#1f1b24',  # blackened iron dark
    'i': '#36303d',  # iron mid
    'h': '#524b5c',  # iron light
    'w': '#8a8194',  # iron highlight
    'R': '#9a1222',  # blood red
    'r': '#5a0e18',  # dark red
    'E': '#ff4a4a',  # glowing blood
    'e': '#c01b2a',
    'B': '#e0d4b4',  # bone
    'b': '#a08e70',  # bone shade
    'c': '#6b5a45',  # bone deep
    'o': '#2a1b3d',  # obsidian
}


def rgba(ch):
    return hexc(PAL[ch]) if ch in PAL else (0, 0, 0, 0)


def boxuv(u, v, w, h, d):
    return {'up': (u + d, v, w, d), 'down': (u + d + w, v, w, d),
            'right': (u, v + d, d, h), 'front': (u + d, v + d, w, h),
            'left': (u + d + w, v + d, d, h), 'back': (u + 2 * d + w, v + d, w, h)}


def put(img, rect, rows):
    x0, y0, w, h = rect
    assert len(rows) == h and all(len(r) == w for r in rows), (rect, rows)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                img.putpixel((x0 + x, y0 + y), rgba(ch))


# ------------------------------------------------------------------ layer 1
def layer1():
    img = Image.new('RGBA', (64, 32), (0, 0, 0, 0))
    head = boxuv(0, 0, 8, 8, 8)
    put(img, head['front'], [
        "IhBRRBhI",
        "IiihhiiI",
        "KIiRRiIK",
        "KEEKKEEK",
        "KKrihrKK",
        "IiKihKiI",
        "IrKiiKrI",
        "rRKrrKRr"])
    side = [
        "hwhhhhhI",
        "iiiiihiI",
        "iBBbiiiI",
        "BbcBbiiI",
        "BciBbiiI",
        "iBBbiiII",
        "IiiiiiII",
        "rRRRRRRr"]
    put(img, head['right'], side)
    put(img, head['left'], [r[::-1] for r in side])
    put(img, head['back'], [
        "IhhBBhhI",
        "IiiBbiiI",
        "IiiBbiiI",
        "IiiBbiiI",
        "IiiBbiiI",
        "IiiBbiiI",
        "rRRBbRRr",
        "KrrrrrrK"])
    put(img, head['up'], [
        "IihBBhiI",
        "ihhBbhhi",
        "ihiBbihi",
        "iiiBbiii",
        "iiiBbiii",
        "ihiBbihi",
        "ihhBbhhi",
        "IiiBBiiI"])
    put(img, head['down'], ["KKKKKKKK"] * 8)

    # hat overlay (renders slightly larger): crown teeth + side horns
    hat = boxuv(32, 0, 8, 8, 8)
    put(img, hat['front'], [
        "B..BB..B",
        "b..bb..b",
        "........", "........", "........", "........", "........", "........"])
    horn = [
        "......BB",
        ".....Bb.",
        "....Bb..",
        "........", "........", "........", "........", "........"]
    put(img, hat['right'], [r[::-1] for r in horn])
    put(img, hat['left'], horn)

    # body (chestplate)
    body = boxuv(16, 16, 8, 12, 4)
    put(img, body['front'], [
        "hwhKKhwh",
        "ihiKKihi",
        "IcBrrBcI",
        "IiKEEKiI",
        "IcBeeBcI",
        "IiiKKiiI",
        "IcBBBBcI",
        "KIibbiIK",
        "RRRBBRRR",
        "rrrbbrrr",
        "KrRrrRrK",
        "KrRKKRrK"])
    put(img, body['back'], [
        "hhwhhwhh",
        "iiiBBiii",
        "IiiBbiiI",
        "IiBbbBiI",
        "IiiBbiiI",
        "IiBbbBiI",
        "IiiBbiiI",
        "KIiBbiIK",
        "RRRRRRRR",
        "rrrrrrrr",
        "KrRrrRrK",
        "KrRKKRrK"])
    bside = ["hwhh", "iiih", "IiiI", "IiiI", "IhiI", "IiiI", "IiiI", "KIIK",
             "RRRR", "rrrr", "rRRr", "KrrK"]
    put(img, body['right'], bside)
    put(img, body['left'], [r[::-1] for r in bside])
    put(img, body['up'], ["hwhhhhwh", "hiiBBiih", "iiiBBiii", "IiiiiiiI"])
    put(img, body['down'], ["KrrrrrrK", "rRrRRrRr", "rrrrrrrr", "KKKKKKKK"])

    # arms (pauldron + sleeve + vambrace)
    arm = boxuv(40, 16, 4, 12, 4)
    outer = ["BwhB", "hiih", "IiiI", "KRRK", "rRRr", "rRRr", "rrrr", "hwhh", "iEii", "IiiI", "IeiI", "KRRK"]
    inner = ["hhhh", "iiii", "IiiI", "KrrK", "rRRr", "rRRr", "rrrr", "hhhh", "iiii", "IiiI", "IiiI", "KrrK"]
    front = ["BwhB", "hiih", "IiiI", "KRRK", "rRRr", "rRRr", "rrrr", "hwhh", "iiEi", "IiiI", "IieI", "KRRK"]
    put(img, arm['right'], outer)
    put(img, arm['front'], front)
    put(img, arm['left'], inner)
    put(img, arm['back'], [r[::-1] for r in front])
    put(img, arm['up'], ["BhhB", "hwwh", "hiih", "BhhB"])
    put(img, arm['down'], ["KKKK", "KiiK", "KiiK", "KKKK"])

    # boots on leg box (lower 6 rows only)
    leg = boxuv(0, 16, 4, 12, 4)
    empty = ["...."] * 6
    put(img, leg['front'], empty + ["hwhh", "iEii", "RRRR", "IiiI", "BIIB", "BBbB"])
    put(img, leg['right'], empty + ["hwhh", "iiii", "RRRR", "IiiI", "IiiI", "KcbK"])
    put(img, leg['left'], empty + ["hhwh", "iiii", "RRRR", "IiiI", "IiiI", "KbcK"])
    put(img, leg['back'], empty + ["hhhh", "iiii", "RRRR", "IiiI", "IhhI", "KIIK"])
    put(img, leg['down'], ["KcbK", "KIIK", "KIIK", "KKKK"])
    return img


# ------------------------------------------------------------------ layer 2
def layer2():
    img = Image.new('RGBA', (64, 32), (0, 0, 0, 0))
    body = boxuv(16, 16, 8, 12, 4)
    top = ["........"] * 7
    put(img, body['front'], top + ["KKKKKKKK", "RRRBBRRR", "rrrbcrrr", "IiIrrIiI", "ihKrrKhi"])
    put(img, body['back'], top + ["KKKKKKKK", "RRRRRRRR", "rrrrrrrr", "IiIrrIiI", "ihKrrKhi"])
    put(img, body['right'], ["...."] * 7 + ["KKKK", "RRRR", "rrrr", "IiiI", "hiih"])
    put(img, body['left'], ["...."] * 7 + ["KKKK", "RRRR", "rrrr", "IiiI", "hiih"])
    put(img, body['down'], ["rrrrrrrr", "rRrRRrRr", "rrrrrrrr", "rrrrrrrr"])

    leg = boxuv(0, 16, 4, 12, 4)
    put(img, leg['front'], ["RRRR", "IhhI", "hwih", "IiiI", "KrrK", "rRRr", "BwwB", "hBBh", "IiiI", "rRRr", "rrrr", "...."])
    put(img, leg['right'], ["RRRR", "IhiI", "hiih", "IiiI", "KrrK", "rRRr", "hwhh", "IiiI", "IiiI", "rRRr", "rrrr", "...."])
    put(img, leg['left'], ["RRRR", "IihI", "hiih", "IiiI", "KrrK", "rRRr", "hhwh", "IiiI", "IiiI", "rRRr", "rrrr", "...."])
    put(img, leg['back'], ["RRRR", "IiiI", "iiii", "IiiI", "KrrK", "rRRr", "rRRr", "rRRr", "rRRr", "rRRr", "rrrr", "...."])
    put(img, leg['up'], ["rrrr", "rRRr", "rRRr", "rrrr"])
    return img


# ------------------------------------------------------------------ icons
ICONS = {
    'helmet': [
        "................",
        ".Bb..........bB.",
        ".bBb..KKKK..bBb.",
        "..bBKKhwwhKKBb..",
        "...KhhiRRiihhK..",
        "..KhiiiRRiiihK..",
        "..KiiIIrrIIiiK..",
        "..KiKEEKKEEKiK..",
        "..KiKKKKKKKKiK..",
        "..KIiKKiiKKiIK..",
        "..KIrK.Ki.KrIK..",
        "..KrRK.KK.KRrK..",
        "..KKK......KKK..",
        "................",
        "................",
        "................"],
    'chestplate': [
        "................",
        ".KKKK......KKKK.",
        "KhwhhK....KhhwhK",
        "KhiiihKKKKhiiihK",
        "KiiIiiBbbBiiIiiK",
        "KKKKiBbRRbBiKKKK",
        "...KiBrEErBiK...",
        "...KiiBRRBiiK...",
        "...KIiBbbBiIK...",
        "...KIiiBBiiIK...",
        "...KrIiiiiIrK...",
        "...KRrrBBrrRK...",
        "...KrRrRRrRrK...",
        "...KKKKKKKKKK...",
        "................",
        "................"],
    'leggings': [
        "................",
        "...KKKKKKKKKK...",
        "...KRRRBBRRRK...",
        "...KhiiiiiihK...",
        "...KiiIKKIiiK...",
        "...KiIK..KIiK...",
        "...KBwK..KwBK...",
        "...KhBK..KBhK...",
        "...KiiK..KiiK...",
        "...KrIK..KIrK...",
        "...KIiK..KiIK...",
        "...KRrK..KrRK...",
        "...KrrK..KrrK...",
        "...KKKK..KKKK...",
        "................",
        "................"],
    'boots': [
        "................",
        "................",
        "................",
        "................",
        "..KKKK....KKKK..",
        "..KhwK....KwhK..",
        "..KiiK....KiiK..",
        "..KRRK....KRRK..",
        "..KrRK....KRrK..",
        ".KIiiK....KiiIK.",
        "KBIiEK....KEiIBK",
        "KBbiiK....KiibBK",
        "KKKKKK....KKKKKK",
        "................",
        "................",
        "................"],
}


def icon(name):
    rows = ICONS[name]
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    put(img, (0, 0, 16, 16), rows)
    return img


# ------------------------------------------------------------------ preview
def preview(l1, l2):
    """Build a throwaway armor-stand model using both layers and render it."""
    tex = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    tex.paste(l1, (0, 0)); tex.paste(l2, (0, 32))
    els = []
    def box(frm, to, u, v, w, h, d, inflate, voff=0):
        r = boxuv(u, v + voff, w, h, d)
        f = {}
        m = {'north': 'front', 'south': 'back', 'east': 'right', 'west': 'left', 'up': 'up', 'down': 'down'}
        for k, n in m.items():
            x, y, ww, hh = r[n]
            f[k] = {'uv': [x, y, x + ww, y + hh], 'texture': 0}
        x, y, ww, hh = r['down']
        f['down']['uv'] = [x, y + hh, x + ww, y]
        els.append({'from': frm, 'to': to, 'inflate': inflate, 'faces': f, 'uuid': uid(), 'origin': [0, 0, 0]})
    # vanilla player in model units (y up, feet at 0), facing -Z => player front = north
    box([-4, 24, -4], [4, 32, 4], 0, 0, 8, 8, 8, 1.0)
    box([-4, 24, -4], [4, 32, 4], 32, 0, 8, 8, 8, 1.5)
    box([-4, 12, -2], [4, 24, 2], 16, 16, 8, 12, 4, 1.0)
    box([4, 12, -2], [8, 24, 2], 40, 16, 4, 12, 4, 1.0)
    box([-8, 12, -2], [-4, 24, 2], 40, 16, 4, 12, 4, 1.0)
    box([-0.1, 0, -2], [3.9, 12, 2], 0, 16, 4, 12, 4, 1.0)
    box([-3.9, 0, -2], [0.1, 12, 2], 0, 16, 4, 12, 4, 1.0)
    box([-4, 12, -2], [4, 24, 2], 16, 16, 8, 12, 4, 0.5, 32)
    box([-0.1, 0, -2], [3.9, 12, 2], 0, 16, 4, 12, 4, 0.5, 32)
    box([-3.9, 0, -2], [0.1, 12, 2], 0, 16, 4, 12, 4, 0.5, 32)
    model = {'elements': els, 'groups': [], 'outliner': [e['uuid'] for e in els],
             'textures': [{'source': png_data_url(tex)}], 'animations': []}
    return [render(model, yaw=y, size=300, pitch=10) for y in (-25, 30, 180)]


if __name__ == '__main__':
    l1, l2 = layer1(), layer2()
    l1.save(os.path.join(OUT, 'armor', 'humanoid.png'))
    l2.save(os.path.join(OUT, 'armor', 'humanoid_leggings.png'))
    icons = []
    for n in ICONS:
        ic = icon(n); ic.save(os.path.join(OUT, 'armor', 'icons', f'{n}.png'))
        icons.append(ic.resize((300, 300), Image.NEAREST))
    views = preview(l1, l2)
    flat = Image.new('RGBA', (64, 64), (60, 60, 70, 255))
    flat.alpha_composite(l1, (0, 0)); flat.alpha_composite(l2, (0, 32))
    sheet(views + [flat.resize((300, 300), Image.NEAREST)] + icons, 4).save(os.path.join(OUT, 'preview', 'armor.png'))
    print('ok')
