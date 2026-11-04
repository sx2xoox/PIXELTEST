// 픽셀아트 엔진: 픽셀 단위로 정확하게(안티앨리어싱 없이) 그리고, 색상 이동 램프, 자동 음영,
// 선택적 외곽선, 이음새 없는(tileable) 노이즈, 디더링을 제공한다.
import { hexToRgb, rgbToHex, hexToOklch, oklch } from './color.js';
import { encodePNG } from './png.js';
import { rng } from './geom.js';

// ---------- 색 ----------
const toward = (h, target, amt) => {
  let d = ((target - h + 540) % 360) - 180;
  return (h + Math.sign(d) * Math.min(Math.abs(d), amt) + 360) % 360;
};

/**
 * 픽셀아트용 램프: 어두울수록 차가운 쪽(파랑/보라)으로, 밝을수록 따뜻한 쪽(노랑)으로 색상을 옮긴다(hue shifting).
 * 채도는 중간에서 가장 높다. 반환: 어두운 → 밝은 순서의 hex 배열.
 */
export function pixelRamp(baseHex, n = 5, { hueShift = 18, spread = 0.13, chroma = 1 } = {}) {
  const { L, C, H } = hexToOklch(baseHex);
  const mid = (n - 1) / 2;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i - mid) / Math.max(1, mid); // -1(어둠) ~ +1(밝음)
    const l = Math.min(0.98, Math.max(0.12, L + t * spread * mid));
    const h = t < 0 ? toward(H, 270, -t * hueShift) : toward(H, 95, t * hueShift * 0.8);
    const c = C * chroma * (1 - 0.35 * Math.abs(t) ** 1.5) * (t < 0 ? 1 + 0.1 * -t : 1);
    out.push(oklch(l, c, h));
  }
  return out;
}

const parse = c => {
  if (c == null) return null;
  if (Array.isArray(c)) return c.length === 4 ? c : [...c, 255];
  const [r, g, b] = hexToRgb(c);
  const a = c.length === 9 ? parseInt(c.slice(7), 16) : 255;
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), a];
};

// ---------- 노이즈 ----------
/** 이음새 없는 값 노이즈(주기 = w/cell). 마인크래프트 블록 텍스처는 반드시 타일링되어야 한다. */
export function tileNoise(w, h, { cell = 4, seed = 1, octaves = 2 } = {}) {
  const R = rng(seed);
  const out = new Float32Array(w * h);
  let amp = 1, norm = 0, c = cell;
  for (let o = 0; o < octaves; o++) {
    const gw = Math.max(1, Math.round(w / c)), gh = Math.max(1, Math.round(h / c));
    const grid = Array.from({ length: gw * gh }, () => R());
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const fx = (x / w) * gw, fy = (y / h) * gh;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = fx - x0, ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const g = (i, j) => grid[((j % gh) + gh) % gh * gw + (((i % gw) + gw) % gw)];
        const v = g(x0, y0) * (1 - sx) * (1 - sy) + g(x0 + 1, y0) * sx * (1 - sy) + g(x0, y0 + 1) * (1 - sx) * sy + g(x0 + 1, y0 + 1) * sx * sy;
        out[y * w + x] += v * amp;
      }
    norm += amp; amp *= 0.5; c = Math.max(1, c / 2);
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];

// ---------- 캔버스 ----------
export class PixelCanvas {
  constructor(w, h = w) {
    this.w = w; this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }
  static from(w, h, fn) { const c = new PixelCanvas(w, h); c.each((x, y) => c.set(x, y, fn(x, y))); return c; }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (!this.in(x, y)) return this;
    const i = (y * this.w + x) * 4;
    const p = parse(c);
    if (!p) { this.data[i + 3] = 0; return this; }
    if (p[3] === 255 || this.data[i + 3] === 0) { this.data.set(p, i); return this; }
    const a = p[3] / 255;
    for (let k = 0; k < 3; k++) this.data[i + k] = this.data[i + k] * (1 - a) + p[k] * a;
    this.data[i + 3] = Math.max(this.data[i + 3], p[3]);
    return this;
  }
  get(x, y) {
    if (!this.in(x, y)) return null;
    const i = (y * this.w + x) * 4;
    if (this.data[i + 3] === 0) return null;
    return rgbToHex([this.data[i] / 255, this.data[i + 1] / 255, this.data[i + 2] / 255]);
  }
  alpha(x, y) { return this.in(x, y) ? this.data[(y * this.w + x) * 4 + 3] : 0; }
  each(fn) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) fn(x, y); return this; }
  fill(c) { return this.each((x, y) => this.set(x, y, c)); }
  clear() { this.data.fill(0); return this; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); return this; }
  hline(x0, x1, y, c) { for (let x = x0; x <= x1; x++) this.set(x, y, c); return this; }
  vline(x, y0, y1, c) { for (let y = y0; y <= y1; y++) this.set(x, y, c); return this; }
  /** 브레젠험 직선: 픽셀아트에서 깔끔한 계단(1:1, 1:2, 2:1)이 나오게 끝점을 잡을 것 */
  line(x0, y0, x1, y1, c) {
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  /** 채운 타원(픽셀 중심 판정) */
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    return this;
  }
  /** 채운 다각형(픽셀 중심 판정, even-odd) */
  poly(points, c) {
    const ys = points.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const py = y + 0.5;
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length];
        if ((ay <= py && by > py) || (by <= py && ay > py)) xs.push(ax + ((py - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, c);
    }
    return this;
  }
  /**
   * 문자 지도로 직접 찍기 — Claude가 픽셀아트를 "그리는" 가장 정확한 방법.
   * rows: ["..ab..", ...], legend: {a:'#hex', b:'#hex'}; '.'과 ' '은 건너뜀, '_'는 지움
   */
  chars(x, y, rows, legend) {
    rows.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch === '.' || ch === ' ') return;
        if (ch === '_') return this.set(x + i, y + j, null);
        const col = legend[ch];
        if (col === undefined) throw new Error(`legend에 없는 문자 '${ch}'`);
        this.set(x + i, y + j, col);
      })
    );
    return this;
  }
  mask() { const m = new Uint8Array(this.w * this.h); this.each((x, y) => (m[y * this.w + x] = this.alpha(x, y) > 0 ? 1 : 0)); return m; }

  /** 바깥 1px 외곽선. color:'auto'면 인접 픽셀을 어둡고 차갑게 만든 색(선택적 외곽선, selout) */
  outline(color = 'auto', { diagonal = false } = {}) {
    const m = this.mask();
    const adds = [];
    const cache = new Map();
    const N = diagonal ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    this.each((x, y) => {
      if (m[y * this.w + x]) return;
      for (const [dx, dy] of N) {
        const nx = x + dx, ny = y + dy;
        if (this.in(nx, ny) && m[ny * this.w + nx]) {
          let col = color;
          if (color === 'auto') {
            // 색상 계열(30° 단위)마다 외곽선 색을 하나로 통일 → 팔레트가 불어나지 않는다
            const { C, H } = hexToOklch(this.get(nx, ny));
            const key = C < 0.03 ? 'gray' : String(Math.round(H / 30) % 12);
            if (!cache.has(key)) {
              const hb = C < 0.03 ? H : Math.round(H / 30) * 30;
              cache.set(key, oklch(0.24, Math.min(0.09, Math.max(0.02, C * 0.6)), toward(hb, 280, 25)));
            }
            col = cache.get(key);
          }
          adds.push([x, y, col]);
          break;
        }
      }
    });
    adds.forEach(([x, y, c]) => this.set(x, y, c));
    return this;
  }

  /**
   * 자동 음영: 마스크 형태를 돔(dome)으로 보고 빛 방향에 따라 ramp 단계를 고른다.
   * ramp: 어두운→밝은 hex 배열, light: [lx, ly] (화면 좌표, 기본 왼쪽 위)
   */
  autoShade(mask, ramp, { light = [-1, -1], radius = 3, ambient = 0.35, dither = false } = {}) {
    const { w, h } = this;
    const INF = 1e9;
    const d = new Float32Array(w * h).map((_, i) => (mask[i] ? INF : 0));
    // 체임퍼 거리 변환(가장자리까지 거리)
    const pass = (xs, ys, nb) => {
      for (const y of ys) for (const x of xs) {
        const i = y * w + x;
        if (!d[i]) continue;
        for (const [dx, dy, c] of nb) {
          const nx = x + dx, ny = y + dy;
          const v = nx < 0 || ny < 0 || nx >= w || ny >= h ? 0 : d[ny * w + nx];
          if (v + c < d[i]) d[i] = v + c;
        }
      }
    };
    const X = [...Array(w).keys()], Y = [...Array(h).keys()];
    pass(X, Y, [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.4], [1, -1, 1.4]]);
    pass([...X].reverse(), [...Y].reverse(), [[1, 0, 1], [0, 1, 1], [1, 1, 1.4], [-1, 1, 1.4]]);
    const hgt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : Math.min(d[y * w + x], radius) / radius);
    const ll = Math.hypot(light[0], light[1], 1);
    const L = [light[0] / ll, light[1] / ll, 1 / ll];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        const nx = (hgt(x - 1, y) - hgt(x + 1, y)) * 1.2, ny = (hgt(x, y - 1) - hgt(x, y + 1)) * 1.2;
        const nl = Math.hypot(nx, ny, 1);
        // 빛은 화면상 light 쪽에서 온다 → 빛 쪽을 향한 면(노멀이 -light 방향)이 밝음
        let b = (-nx * L[0] - ny * L[1] + 1 * L[2]) / nl;
        b = ambient + (1 - ambient) * Math.max(0, b);
        let t = Math.min(0.999, Math.max(0, (b - 0.35) / 0.7)) * ramp.length;
        if (dither) t += (bayer(x, y) - 0.5) * 0.9;
        this.set(x, y, ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(t)))]);
      }
    return this;
  }

  /** 노이즈로 ramp 단계를 골라 채우기(돌, 흙, 털, 천 질감). mask가 없으면 전체 */
  noiseFill(ramp, { mask, seed = 1, cell = 4, octaves = 2, contrast = 1, bias = 0, dither = 0.3 } = {}) {
    const n = tileNoise(this.w, this.h, { cell, seed, octaves });
    this.each((x, y) => {
      const i = y * this.w + x;
      if (mask && !mask[i]) return;
      let v = (n[i] - 0.5) * contrast + 0.5 + bias + (bayer(x, y) - 0.5) * dither * 0.3;
      const k = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length)));
      this.set(x, y, ramp[k]);
    });
    return this;
  }
  /** 무작위 점 뿌리기(얼룩, 반점, 광물 알갱이) */
  speckle(colors, { count = 10, seed = 2, mask, size = 1 } = {}) {
    const R = rng(seed);
    for (let k = 0; k < count; k++) {
      const x = Math.floor(R() * this.w), y = Math.floor(R() * this.h);
      if (mask && !mask[y * this.w + x]) continue;
      const c = colors[Math.floor(R() * colors.length)];
      for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) this.set((x + i) % this.w, (y + j) % this.h, c);
    }
    return this;
  }
  paste(src, ox = 0, oy = 0) { src.each((x, y) => { const c = src.get(x, y); if (c) this.set(ox + x, oy + y, c); }); return this; }
  clone() { const c = new PixelCanvas(this.w, this.h); c.data.set(this.data); return c; }
  crop(x, y, w, h) { const c = new PixelCanvas(w, h); c.each((i, j) => { const v = this.get(x + i, y + j); if (v) c.set(i, j, v); }); return c; }
  flipX() { const c = new PixelCanvas(this.w, this.h); this.each((x, y) => c.set(this.w - 1 - x, y, this.get(x, y))); return c; }
  rotate90() { const c = new PixelCanvas(this.h, this.w); this.each((x, y) => c.set(this.h - 1 - y, x, this.get(x, y))); return c; }
  /** 정수배 확대(최근접) */
  scale(k) { const c = new PixelCanvas(this.w * k, this.h * k); this.each((x, y) => { const v = this.get(x, y); if (v) c.rect(x * k, y * k, k, k, v); }); return c; }
  colors() { const s = new Map(); this.each((x, y) => { const v = this.get(x, y); if (v) s.set(v, (s.get(v) || 0) + 1); }); return s; }
  toPNG() { return encodePNG(this.w, this.h, this.data); }
  toDataURL() { return 'data:image/png;base64,' + this.toPNG().toString('base64'); }
}
