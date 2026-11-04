// 마인크래프트 감각의 절차적 재질. 모든 재질은 (w, h, opt) → PixelCanvas 이며 이음새 없이 타일링된다.
// 마인크래프트 텍스처 원칙(요약):
//  - 1 텍셀 = 1/16 블록. 텍셀 밀도를 섞지 않는다(믹셀 금지).
//  - 블록 텍스처에 방향 음영을 굽지 않는다(게임이 면마다 위1.0/남북0.8/동서0.6/아래0.5로 음영을 준다).
//  - 한 텍스처에 4~8색 정도의 램프. 순검정/순백은 거의 쓰지 않는다.
//  - 노이즈는 "덩어리"가 보여야 한다(1px 소금후추 노이즈는 지저분함). 2~4px 군집을 만든다.
import { PixelCanvas, pixelRamp, tileNoise, bayer } from '../pixel.js';
import { rng } from '../geom.js';
import { mix } from '../color.js';

const isSide = f => ['north', 'south', 'east', 'west'].includes(f);

function bevel(c, ramp, k = 1) {
  // 모델 가독성을 위한 아주 약한 가장자리 강조(위/왼쪽 밝게, 아래/오른쪽 어둡게). 블록 전체 면에는 쓰지 않는다.
  const { w, h } = c;
  if (w < 3 || h < 3) return c;
  const lighten = col => mix(col, ramp[ramp.length - 1], 0.35 * k);
  const darken = col => mix(col, ramp[0], 0.45 * k);
  for (let x = 0; x < w; x++) { c.set(x, 0, lighten(c.get(x, 0) ?? ramp[2])); c.set(x, h - 1, darken(c.get(x, h - 1) ?? ramp[1])); }
  for (let y = 1; y < h - 1; y++) { c.set(0, y, lighten(c.get(0, y) ?? ramp[2])); c.set(w - 1, y, darken(c.get(w - 1, y) ?? ramp[1])); }
  return c;
}

export const MATERIALS = {
  solid(w, h, { color = '#888888' } = {}) {
    return new PixelCanvas(w, h).fill(color);
  },

  stone(w, h, { base = '#8b8b8b', seed = 1, contrast = 2, cracks = true } = {}) {
    const r = pixelRamp(base, 5, { spread: 0.05, hueShift: 6, chroma: 0.6 });
    const c = new PixelCanvas(w, h).noiseFill(r.slice(1, 5), { seed, cell: 4, octaves: 2, contrast });
    if (!cracks) return c;
    // 짧은 균열/어두운 결
    const R = rng(seed * 7);
    for (let k = 0; k < Math.max(2, (w * h) / 40); k++) {
      const x = Math.floor(R() * w), y = Math.floor(R() * h), len = 1 + Math.floor(R() * 3);
      for (let i = 0; i < len; i++) c.set((x + i) % w, y, r[R() < 0.5 ? 0 : 1]);
    }
    c.speckle([r[4]], { count: Math.ceil((w * h) / 28), seed: seed + 3 });
    return c;
  },

  dirt(w, h, { base = '#7a5636', seed = 2 } = {}) {
    const r = pixelRamp(base, 5, { spread: 0.06, hueShift: 10 });
    const c = new PixelCanvas(w, h).noiseFill(r.slice(1, 4), { seed, cell: 3, contrast: 1.8 });
    c.speckle([r[0], r[4]], { count: Math.ceil((w * h) / 14), seed: seed + 9 });
    return c;
  },

  sand(w, h, { base = '#dbcf95', seed = 3 } = {}) {
    const r = pixelRamp(base, 5, { spread: 0.035, hueShift: 8 });
    const c = new PixelCanvas(w, h).noiseFill(r.slice(1, 4), { seed, cell: 4, contrast: 1.4 });
    c.speckle([r[0], r[4]], { count: Math.ceil((w * h) / 18), seed: seed + 1 });
    return c;
  },

  grass(w, h, { base = '#6fae3c', dirtBase = '#7a5636', face = 'up', seed = 4, fringe = 3 } = {}) {
    const g = pixelRamp(base, 5, { spread: 0.06, hueShift: 22 });
    if (face === 'up') {
      const c = new PixelCanvas(w, h).noiseFill(g.slice(1, 5), { seed, cell: 3, contrast: 1.7 });
      c.speckle([g[0]], { count: Math.ceil((w * h) / 20), seed: seed + 5 });
      return c;
    }
    if (face === 'down') return MATERIALS.dirt(w, h, { base: dirtBase, seed });
    // 옆면: 흙 + 위쪽 불규칙한 잔디 술
    const c = MATERIALS.dirt(w, h, { base: dirtBase, seed });
    const R = rng(seed + 11);
    for (let x = 0; x < w; x++) {
      const depth = Math.max(1, fringe - 1 + Math.floor(R() * 3) - (R() < 0.25 ? 1 : 0));
      for (let y = 0; y < Math.min(h, depth); y++) c.set(x, y, g[y === depth - 1 ? 1 : 2 + Math.floor(R() * 2)]);
    }
    return c;
  },

  planks(w, h, { base = '#a7834f', seed = 5, board = 4 } = {}) {
    const r = pixelRamp(base, 5, { spread: 0.06, hueShift: 12 });
    const c = new PixelCanvas(w, h);
    const R = rng(seed);
    for (let by = 0; by < h; by += board) {
      const off = Math.floor(R() * w);
      const n = tileNoise(w, board, { cell: 8, seed: seed + by, octaves: 1 });
      for (let y = by; y < Math.min(h, by + board); y++)
        for (let x = 0; x < w; x++) {
          const v = n[(y - by) * w + x];
          c.set(x, y, r[v > 0.62 ? 3 : v < 0.35 ? 1 : 2]);
        }
      // 결(가로줄)
      const gy = by + 1 + Math.floor(R() * (board - 2));
      for (let x = 0; x < w; x++) if (R() < 0.55) c.set(x, gy, r[1]);
      c.hline(0, w - 1, Math.min(h - 1, by + board - 1), r[0]); // 판 사이 이음매
      c.set((off) % w, by, r[0]); c.set(off % w, Math.min(h - 1, by + 1), r[0]); // 판 끝 이음매
      c.set((off + 1) % w, by, r[4]);
    }
    return c;
  },

  log(w, h, { bark = '#6a4c2d', inner = '#b88f58', face = 'north', seed = 6 } = {}) {
    if (isSide(face)) {
      const r = pixelRamp(bark, 5, { spread: 0.06, hueShift: 10 });
      const c = new PixelCanvas(w, h);
      const n = tileNoise(w, h, { cell: 2, seed, octaves: 1 });
      // 세로 줄무늬 껍질: x마다 기본 톤을 정하고 y로 길게 늘인다
      for (let x = 0; x < w; x++) {
        const col = n[x] > 0.66 ? 3 : n[x] < 0.33 ? 1 : 2;
        for (let y = 0; y < h; y++) c.set(x, y, r[col]);
      }
      const R = rng(seed + 2);
      for (let k = 0; k < w; k++) {
        const x = Math.floor(R() * w), y = Math.floor(R() * h), len = 2 + Math.floor(R() * 4);
        const col = r[R() < 0.6 ? 0 : 4];
        for (let i = 0; i <= len; i++) c.set(x, (y + i) % h, col);
      }
      return c;
    }
    const ri = pixelRamp(inner, 5, { spread: 0.05, hueShift: 10 });
    const rb = pixelRamp(bark, 4, { spread: 0.06 });
    const c = new PixelCanvas(w, h);
    const cx = (w - 1) / 2, cy = (h - 1) / 2;
    c.each((x, y) => {
      const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (edge === 0) return c.set(x, y, rb[1 + ((x + y) % 2)]);
      const d = Math.max(Math.abs(x - cx), Math.abs(y - cy)) + (bayer(x, y) - 0.5) * 0.6;
      c.set(x, y, ri[Math.floor(d) % 2 ? 2 : 3]);
    });
    return c;
  },

  cobble(w, h, { base = '#7f7f7f', seed = 7, stones = 6 } = {}) {
    const r = pixelRamp(base, 5, { spread: 0.07, hueShift: 6, chroma: 0.6 });
    const R = rng(seed);
    const pts = Array.from({ length: stones }, () => [R() * w, R() * h, Math.floor(R() * 3)]);
    const c = new PixelCanvas(w, h);
    // 이음새 없는 보로노이: 주변 타일까지 고려
    const near = (x, y) => {
      let best = [1e9, 1e9, -1];
      pts.forEach((p, i) => {
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const d = Math.hypot(x + 0.5 - (p[0] + ox * w), y + 0.5 - (p[1] + oy * h));
          if (d < best[0]) best = [d, best[0], i];
          else if (d < best[1]) best[1] = d;
        }
      });
      return best;
    };
    c.each((x, y) => {
      const [d1, d2, i] = near(x, y);
      if (d2 - d1 < 1.1) return c.set(x, y, r[0]); // 줄눈
      const tone = 1 + pts[i][2];
      // 돌 하나하나 왼쪽 위가 살짝 밝음(볼록함)
      const hl = d2 - d1 > 2.6 && (x + y) % 5 === 0 ? 1 : 0;
      c.set(x, y, r[Math.min(4, tone + hl)]);
    });
    return c;
  },

  leaves(w, h, { base = '#4f8a2b', seed = 8, holes = true } = {}) {
    const r = pixelRamp(base, 5, { spread: 0.07, hueShift: 24 });
    const c = new PixelCanvas(w, h).noiseFill(r.slice(0, 4), { seed, cell: 2, contrast: 2 });
    c.speckle([r[4]], { count: Math.ceil((w * h) / 12), seed: seed + 1 });
    if (holes) {
      const R = rng(seed + 4);
      for (let k = 0; k < (w * h) / 24; k++) c.set(Math.floor(R() * w), Math.floor(R() * h), null);
    }
    return c;
  },

  ore(w, h, { base = '#8b8b8b', ore = '#4fd1c5', seed = 9, veins = 4 } = {}) {
    const c = MATERIALS.stone(w, h, { base, seed });
    const o = pixelRamp(ore, 4, { spread: 0.1, hueShift: 20 });
    const R = rng(seed + 5);
    for (let k = 0; k < Math.max(2, Math.round((veins * w * h) / 256)); k++) {
      const x = Math.floor(R() * (w - 2)), y = Math.floor(R() * (h - 2));
      const shape = [[0, 0, 2], [1, 0, 3], [0, 1, 1], [1, 1, 2], [2, 1, R() < 0.5 ? 3 : -1]];
      shape.forEach(([dx, dy, k2]) => k2 >= 0 && c.set(x + dx, y + dy, o[k2]));
      c.set(x + 1, y - 1 < 0 ? 0 : y - 1, o[0]);
    }
    return c;
  },

  bricks(w, h, { base = '#9b4f3a', mortar = '#b7aa98', seed = 10 } = {}) {
    const r = pixelRamp(base, 5, { spread: 0.06, hueShift: 10 });
    const m = pixelRamp(mortar, 3, { spread: 0.04 });
    const c = new PixelCanvas(w, h);
    const bh = 4, bw = 8;
    const R = rng(seed);
    c.each((x, y) => {
      const row = Math.floor(y / bh);
      const off = row % 2 ? bw / 2 : 0;
      const lx = (x + off) % bw, ly = y % bh;
      if (ly === bh - 1 || lx === bw - 1) return c.set(x, y, m[ly === bh - 1 && lx === bw - 1 ? 0 : 1]);
      c.set(x, y, r[ly === 0 ? 3 : 2]);
    });
    c.speckle([r[1], r[4]], { count: (w * h) / 20, seed: seed + 3 });
    void R;
    return c;
  },

  metal(w, h, { base = '#c8ccd2', seed = 11, rivets = true } = {}) {
    const r = pixelRamp(base, 5, { spread: 0.08, hueShift: 14, chroma: 0.8 });
    const c = new PixelCanvas(w, h).noiseFill(r.slice(2, 4), { seed, cell: 8, octaves: 1, contrast: 1.2 });
    // 사선 반사 줄
    c.each((x, y) => { if ((x + y) % 7 === 0) c.set(x, y, r[4]); });
    bevel(c, r, 1.2);
    if (rivets && w >= 6 && h >= 6) for (const [x, y] of [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]]) c.set(x, y, r[0]);
    return c;
  },

  cloth(w, h, { base = '#c94a4a', seed = 12, pattern = 'weave' } = {}) {
    const r = pixelRamp(base, 4, { spread: 0.05, hueShift: 12 });
    const c = new PixelCanvas(w, h).noiseFill(r.slice(1, 3), { seed, cell: 4, contrast: 1.4 });
    if (pattern === 'weave') c.each((x, y) => { if ((x * 3 + y * 5) % 7 === 0) c.set(x, y, r[3]); });
    if (pattern === 'stripe') c.each((x, y) => { if (y % 4 === 0) c.set(x, y, r[0]); });
    return c;
  },

  fur(w, h, { base = '#c98b4f', seed = 13, face = 'north', strand = 3 } = {}) {
    const r = pixelRamp(base, 5, { spread: 0.06, hueShift: 16 });
    const c = new PixelCanvas(w, h).fill(r[2]);
    const R = rng(seed);
    const vertical = isSide(face);
    for (let k = 0; k < (w * h) / 3; k++) {
      const x = Math.floor(R() * w), y = Math.floor(R() * h), len = 1 + Math.floor(R() * strand);
      const col = r[[1, 3, 3, 1, 0, 4][Math.floor(R() * 6)]];
      for (let i = 0; i < len; i++) vertical ? c.set(x, (y + i) % h, col) : c.set((x + i) % w, y, col);
    }
    return c;
  },

  skin(w, h, { base = '#d7a37a', seed = 14 } = {}) {
    const r = pixelRamp(base, 4, { spread: 0.03, hueShift: 10 });
    return new PixelCanvas(w, h).noiseFill(r.slice(1, 3), { seed, cell: 6, contrast: 1.1, dither: 0.6 });
  },

  moss(w, h, { base = '#5d8f3a', seed = 15 } = {}) {
    const r = pixelRamp(base, 5, { spread: 0.07, hueShift: 26 });
    const c = new PixelCanvas(w, h).noiseFill(r.slice(0, 4), { seed, cell: 3, contrast: 2.2 });
    c.speckle([r[4]], { count: (w * h) / 10, seed: seed + 2 });
    return c;
  },

  glass(w, h, { tint = '#bfe6f0', frame = '#d8eef2' } = {}) {
    const c = new PixelCanvas(w, h);
    const f = pixelRamp(frame, 3, { spread: 0.08 });
    c.each((x, y) => {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      if (edge) c.set(x, y, f[x === 0 || y === 0 ? 2 : 0]);
      else c.set(x, y, tint + '30');
    });
    // 반사 하이라이트 사선
    for (let i = 2; i < Math.min(w, h) - 2; i++) if (i < 6) c.set(i, Math.min(w, h) - 1 - i - 2, '#ffffffb0');
    return c;
  },

  glow(w, h, { base = '#ffcf5a', seed = 16 } = {}) {
    // 발광체: 중심이 가장 밝은 동심 그라디언트(밴딩은 디더로 정리)
    const r = pixelRamp(base, 5, { spread: 0.07, hueShift: 18 });
    const c = new PixelCanvas(w, h);
    const cx = (w - 1) / 2, cy = (h - 1) / 2, R = Math.max(cx, cy) + 0.5;
    c.each((x, y) => {
      const d = Math.hypot((x - cx) / (cx + 0.5), (y - cy) / (cy + 0.5));
      const t = Math.max(0, 1 - d) * 5 + (bayer(x, y) - 0.5) * 0.8;
      c.set(x, y, r[Math.max(1, Math.min(4, Math.floor(t + 1)))]);
    });
    void seed; void R;
    return c;
  },
};

export function material(name, w, h, opt = {}) {
  const fn = MATERIALS[name];
  if (!fn) throw new Error(`알 수 없는 재질: ${name} (가능: ${Object.keys(MATERIALS).join(', ')})`);
  let c = fn(w, h, opt);
  if (opt.bevel) bevel(c, pixelRamp(opt.base ?? opt.color ?? '#888888', 5), opt.bevel === true ? 1 : opt.bevel);
  return c;
}

/**
 * 블록 텍스처 이음새 검사. 이어 붙였을 때 생기는 경계(마지막 줄↔첫 줄)의 차이를
 * 텍스처 내부의 "가장 큰 줄 간 차이"와 비교한다. 벽돌·판자처럼 원래 줄눈이 있는 패턴은 내부에도 큰 경계가 있으므로 통과한다.
 * 반환: { x, y } (1.15 초과면 경계가 튄다)
 */
export function seamScore(c) {
  const lum = hex => (hex ? parseInt(hex.slice(1, 3), 16) * 0.3 + parseInt(hex.slice(3, 5), 16) * 0.59 + parseInt(hex.slice(5, 7), 16) * 0.11 : 0);
  const colDiff = (a, b) => { let s = 0; for (let y = 0; y < c.h; y++) s += Math.abs(lum(c.get(a, y)) - lum(c.get(b, y))); return s / c.h; };
  const rowDiff = (a, b) => { let s = 0; for (let x = 0; x < c.w; x++) s += Math.abs(lum(c.get(x, a)) - lum(c.get(x, b))); return s / c.w; };
  let mx = 1e-6, my = 1e-6;
  for (let x = 0; x < c.w - 1; x++) mx = Math.max(mx, colDiff(x, x + 1));
  for (let y = 0; y < c.h - 1; y++) my = Math.max(my, rowDiff(y, y + 1));
  return { x: colDiff(c.w - 1, 0) / mx, y: rowDiff(c.h - 1, 0) / my };
}
