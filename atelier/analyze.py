#!/usr/bin/env python3
"""Atelier 디자인 분석기 — 레퍼런스(또는 내 결과물)를 '감'이 아니라 숫자로 읽는다.

  python3 -I atelier/analyze.py <이미지...> [--sheet 출력폴더] [--json]

측정 항목(왜 좋은지/나쁜지를 설명할 수 있는 것만):
  value   : 명도 3분할 비율(어둠/중간/밝음), 키(high/mid/low), 대비 범위(p5~p95)
  notan   : 2단 명암(흑백 덩어리)의 비율과 덩어리 수 — 큰 덩어리 몇 개로 정리되는가
  palette : k-means 주요색과 면적 비율, 90% 면적을 덮는 색 수, 채도 분포, 따뜻/차가움 비율
  focal   : 국소 대비(명도+채도) 지도에서 가장 강한 곳의 위치, 3분할 교점과의 거리, 지배도(최댓값/평균)
  detail  : 가장자리 밀도와 3×3 격자별 분포(디테일이 어디에 몰렸나), 빈 공간 비율
  balance : 시각적 무게중심(배경과 다른 정도 + 채도)의 중심에서의 편차, 좌우 대칭도
시트: 원본 | 흑백 | 3단 명도 | 스퀸트(흐림) | 디테일 열지도 | 팔레트 막대
"""
import sys, json, os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def srgb_to_lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def to_lab(rgb):
    lin = srgb_to_lin(rgb.astype(np.float64))
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = lin @ M.T
    xyz /= np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return np.stack([L, a, b], -1)

def box_blur(x, r):
    if r < 1: return x
    k = 2 * r + 1
    p = np.pad(x, ((r, r), (r, r)), mode='edge')
    c = p.cumsum(0).cumsum(1)
    c = np.pad(c, ((1, 0), (1, 0)))
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)

def kmeans(X, k=6, iters=18, seed=1):
    rng = np.random.default_rng(seed)
    C = X[rng.choice(len(X), k, replace=False)]
    for _ in range(iters):
        d = ((X[:, None, :] - C[None]) ** 2).sum(-1)
        lab = d.argmin(1)
        for j in range(k):
            m = X[lab == j]
            if len(m): C[j] = m.mean(0)
    return C, lab

def lab_to_hex(lab, rgb_pixels, labels, j):
    m = rgb_pixels[labels == j]
    if not len(m): return '#000000'
    r, g, b = m.mean(0).astype(int)
    return f'#{r:02x}{g:02x}{b:02x}'

def components(mask):
    """4-연결 덩어리 수(면적 0.5% 이상만)"""
    h, w = mask.shape
    seen = np.zeros_like(mask, bool)
    n = 0
    minA = h * w * 0.005
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not seen[y, x]:
                stack = [(y, x)]; seen[y, x] = True; a = 0
                while stack:
                    cy, cx = stack.pop(); a += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; stack.append((ny, nx))
                if a >= minA: n += 1
    return n

def border_bg(lab, tol=6.0):
    """테두리에 닿은 균일한 바탕(흰 여백 등)을 플러드 필로 찾는다. 테두리 색이 제각각이면(바탕 없음) 빈 마스크"""
    from collections import deque
    h, w = lab.shape[:2]
    ring = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    ref = np.median(ring, 0)
    if (np.sqrt(((ring - ref) ** 2).sum(-1)) < tol).mean() < 0.6: return np.zeros((h, w), bool)
    near = np.sqrt(((lab - ref) ** 2).sum(-1)) < tol
    m = np.zeros((h, w), bool); q = deque()
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not m[y, x]: m[y, x] = True; q.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x] and not m[y, x]: m[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and near[ny, nx] and not m[ny, nx]: m[ny, nx] = True; q.append((ny, nx))
    return m

def analyze(path, sheet_dir=None):
    im = Image.open(path).convert('RGBA')
    s = 384 / max(im.size)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    alpha = np.asarray(im)[..., 3] / 255.0
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
    im = Image.alpha_composite(bg, im).convert('RGB')
    rgb = np.asarray(im).astype(np.float64)
    h, w = rgb.shape[:2]
    lab = to_lab(rgb)
    L = lab[..., 0]
    C = np.hypot(lab[..., 1], lab[..., 2])
    out = {'file': os.path.basename(path), 'size': [w, h]}

    # value
    dark, light = (L < 33).mean(), (L > 66).mean()
    p5, p95 = np.percentile(L, 5), np.percentile(L, 95)
    key = 'high' if np.median(L) > 62 else 'low' if np.median(L) < 38 else 'mid'
    out['value'] = {'dark': round(dark, 3), 'mid': round(1 - dark - light, 3), 'light': round(light, 3), 'key': key, 'range': round(p95 - p5, 1), 'median': round(float(np.median(L)), 1)}

    # notan(2단) — 오츠 임계값
    hist, edges = np.histogram(L, 64, (0, 100))
    best, thr = -1, 50
    tot = hist.sum(); cum = hist.cumsum(); mids = (edges[:-1] + edges[1:]) / 2; cm = (hist * mids).cumsum()
    for i in range(1, 63):
        w0, w1 = cum[i], tot - cum[i]
        if w0 == 0 or w1 == 0: continue
        m0, m1 = cm[i] / w0, (cm[-1] - cm[i]) / w1
        v = w0 * w1 * (m0 - m1) ** 2
        if v > best: best, thr = v, mids[i]
    small = box_blur(L, 2)[::2, ::2]
    out['notan'] = {'threshold': round(float(thr), 1), 'darkShare': round(float((L < thr).mean()), 3), 'shapes': components(small < thr) + components(small >= thr)}

    # palette
    X = lab.reshape(-1, 3); P = rgb.reshape(-1, 3)
    idx = np.random.default_rng(0).choice(len(X), min(6000, len(X)), replace=False)
    Cc, lab_k = kmeans(X[idx].copy(), 6)
    d = ((X[:, None, :] - Cc[None]) ** 2).sum(-1); lab_all = d.argmin(1)
    shares = np.bincount(lab_all, minlength=6) / len(X)
    order = np.argsort(-shares)
    pal = [{'hex': lab_to_hex(None, P, lab_all, j), 'share': round(float(shares[j]), 3), 'L': round(float(Cc[j, 0]), 1), 'C': round(float(np.hypot(Cc[j, 1], Cc[j, 2])), 1)} for j in order]
    cover = int(np.searchsorted(np.cumsum(shares[order]), 0.9) + 1)
    warm = ((lab[..., 1] > 5) | (lab[..., 2] > 10)) & (C > 12)
    cool = ((lab[..., 2] < -8) | (lab[..., 1] < -8)) & (C > 12)
    out['palette'] = {'colors': pal, 'cover90': cover, 'chromaMean': round(float(C.mean()), 1), 'chromaP95': round(float(np.percentile(C, 95)), 1), 'warm': round(float(warm.mean()), 3), 'cool': round(float(cool.mean()), 3), 'neutral': round(float((C <= 12).mean()), 3)}

    # focal: 국소 대비(명도 + 채도) → 흐려서 덩어리 단위로
    r = max(2, int(min(h, w) * 0.04))
    lc = np.abs(L - box_blur(L, r)) + 0.5 * np.abs(C - box_blur(C, r))
    fm = box_blur(lc, max(2, r))
    bdr = max(2, int(min(h, w) * 0.06)); fmi = fm.copy(); fmi[box_blur(((alpha > 0.5) & ~border_bg(lab)).astype(float), r) < 0.999] = 0; fmi[:bdr] = 0; fmi[-bdr:] = 0; fmi[:, :bdr] = 0; fmi[:, -bdr:] = 0  # 캔버스 가장자리(모서리 둥근 아이콘의 흰 귀퉁이 등)는 초점 후보에서 뺀다
    fy, fx = np.unravel_index(fmi.argmax(), fm.shape)
    nx, ny = fx / w, fy / h
    thirds = min(math.hypot(nx - tx, ny - ty) for tx in (1 / 3, 2 / 3) for ty in (1 / 3, 2 / 3))
    out['focal'] = {'x': round(nx, 3), 'y': round(ny, 3), 'toThirds': round(thirds, 3), 'toCenter': round(math.hypot(nx - 0.5, ny - 0.5), 3), 'dominance': round(float(fmi.max() / (fm.mean() + 1e-6)), 2)}

    # detail
    gy, gx = np.gradient(L)
    g = np.hypot(gx, gy)
    edges_ = g > 6
    grid = np.array([[edges_[int(i * h / 3):int((i + 1) * h / 3), int(j * w / 3):int((j + 1) * w / 3)].mean() for j in range(3)] for i in range(3)])
    pg = grid / (grid.sum() + 1e-9)
    ent = float(-(pg * np.log(pg + 1e-12)).sum() / math.log(9))
    calm = box_blur(edges_.astype(float), max(2, r)) < 0.03
    out['detail'] = {'edgeDensity': round(float(edges_.mean()), 3), 'grid': np.round(grid, 3).tolist(), 'spread': round(ent, 3), 'emptySpace': round(float(calm.mean()), 3)}

    # balance: 배경(최빈 색)과의 차이 + 채도 = 시각적 무게
    bgc = Cc[order[0]]
    wgt = np.sqrt(((lab - bgc) ** 2).sum(-1)) + 0.5 * C
    ys, xs = np.mgrid[0:h, 0:w]
    cx, cy = (wgt * xs).sum() / wgt.sum() / w, (wgt * ys).sum() / wgt.sum() / h
    sym = float(np.corrcoef(L.ravel(), L[:, ::-1].ravel())[0, 1])
    out['balance'] = {'cx': round(float(cx), 3), 'cy': round(float(cy), 3), 'offset': round(math.hypot(cx - 0.5, cy - 0.5), 3), 'symmetryLR': round(sym, 3)}

    if sheet_dir:
        os.makedirs(sheet_dir, exist_ok=True)
        gray = Image.fromarray(np.clip(L * 2.55, 0, 255).astype(np.uint8)).convert('RGB')
        q = np.where(L < 33, 40, np.where(L > 66, 225, 135)).astype(np.uint8)
        three = Image.fromarray(q).convert('RGB')
        squint = im.filter(ImageFilter.GaussianBlur(min(w, h) * 0.025))
        heat = (fm / (fm.max() + 1e-9) * 255).astype(np.uint8)
        heat_rgb = np.stack([heat, (heat * 0.45).astype(np.uint8), (255 - heat) // 3], -1)
        hm = Image.fromarray(heat_rgb)
        dr = ImageDraw.Draw(hm); dr.ellipse([fx - 6, fy - 6, fx + 6, fy + 6], outline=(255, 255, 255), width=2)
        for t in (1 / 3, 2 / 3):
            dr.line([(t * w, 0), (t * w, h)], fill=(90, 90, 90)); dr.line([(0, t * h), (w, t * h)], fill=(90, 90, 90))
        bar = Image.new('RGB', (w, h), (24, 24, 28)); db = ImageDraw.Draw(bar); y0 = 0
        for p in pal:
            hh = max(2, round(p['share'] * h)); db.rectangle([0, y0, w, y0 + hh], fill=p['hex']); db.text((6, y0 + 2), f"{p['hex']} {p['share']*100:.0f}%", fill=(255, 255, 255) if p['L'] < 55 else (0, 0, 0)); y0 += hh
        panels = [im, gray, three, squint, hm, bar]
        sheet = Image.new('RGB', (w * 3 + 20, h * 2 + 10), (18, 18, 22))
        for i, pnl in enumerate(panels):
            sheet.paste(pnl, ((i % 3) * (w + 10), (i // 3) * (h + 10)))
        name = os.path.splitext(os.path.basename(path))[0]
        sheet.save(os.path.join(sheet_dir, name + '.study.png'))
        out['sheet'] = os.path.join(sheet_dir, name + '.study.png')
    return out

def brief(o):
    v, p, f, d, b = o['value'], o['palette'], o['focal'], o['detail'], o['balance']
    return (f"{o['file']}: 명도 어둠{v['dark']*100:.0f}/중간{v['mid']*100:.0f}/밝음{v['light']*100:.0f}% {v['key']}키 범위{v['range']} | "
            f"노탄 덩어리 {o['notan']['shapes']}개 | 색 90%={p['cover90']}색 채도평균{p['chromaMean']} 따뜻{p['warm']*100:.0f}/차가움{p['cool']*100:.0f}/무채{p['neutral']*100:.0f}% | "
            f"초점({f['x']:.2f},{f['y']:.2f}) 3분할거리{f['toThirds']} 지배도{f['dominance']} | 디테일 {d['edgeDensity']} 분산{d['spread']} 빈공간{d['emptySpace']*100:.0f}% | "
            f"무게중심 편차{b['offset']} 대칭{b['symmetryLR']}")

if __name__ == '__main__':
    args = sys.argv[1:]
    sheet = None
    if '--sheet' in args:
        i = args.index('--sheet'); sheet = args[i + 1]; del args[i:i + 2]
    as_json = '--json' in args
    args = [a for a in args if a != '--json']
    res = [analyze(a, sheet) for a in args]
    if as_json: print(json.dumps(res, ensure_ascii=False, indent=1))
    else:
        for r in res: print(brief(r))
