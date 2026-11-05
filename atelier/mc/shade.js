// 면 칠하기(인덱스 명암) — bench2의 shade.mjs에서 일반화해 엔진으로 올림. 램프 배열을 직접 받는다.
// pattern(x, y, w, h) → 기본 단계(실수 허용) | null(투명). 옆면: 위 1/3 +0.7, 아래 1/3 -0.7, 윗변 +1.6(테두리 빛), 아랫변 -1.2(AO), 왼쪽 모서리 +0.6, 오른쪽 -0.6
// up 면 +0.8(+테두리 0.8), down 면 -2
import { PixelCanvas } from '../pixel.js';
export function paintFace(R, w, h, face, pattern, { rim = true, ao = true, grad = 1 } = {}) {
  const c = new PixelCanvas(w, h);
  const side = face !== 'up' && face !== 'down';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = pattern(x, y, w, h, face);
    if (v === null || v === undefined) continue;
    if (side) {
      const t = h > 1 ? y / (h - 1) : 0.5;
      v += grad * (t < 0.34 ? 0.7 : t > 0.66 ? -0.7 : 0);
      if (rim && y === 0 && h > 2) v += 1.6;
      if (ao && y === h - 1 && h > 2) v -= 1.2;
      if (rim && (x === 0 || x === w - 1) && w > 3) v += x === 0 ? 0.6 : -0.6;
    } else if (face === 'up') { v += 0.8; if (rim && (y === 0 || x === 0)) v += 0.8; }
    else v -= 2;
    c.set(x, y, R[Math.max(0, Math.min(R.length - 1, Math.round(v)))]);
  }
  return c;
}
/** 바깥 1px 외곽선(4방향) */
export function outline(c, col) {
  const add = [];
  c.each((x, y) => { if (!c.alpha(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => c.alpha(x + dx, y + dy))) add.push([x, y]); });
  for (const [x, y] of add) c.set(x, y, col);
  return c;
}

/**
 * 공식 몹 텍스처 기준 램프(docs/research/minecraft-official-study.md §4): 단계 간 ΔL 3~8, 어두운→밝은 색상 이동 ±5~15°.
 * base = 중간 색, steps = 단계 수(홀수 권장), dL = OKLab 명도 간격(0~1 척도, 0.05 ≈ CIELAB 5), hueShift = 전체 색상 이동(도, 밝은 쪽 +)
 * 어두운 쪽은 채도를 약간 줄이고, 밝은 쪽은 아주 약간 줄인다(공식 텍스처의 채도 곡선).
 */
import { hexToOklch, oklch } from '../color.js';
export function fineRamp(base, { steps = 7, dL = 0.05, hueShift = 10, chromaDark = 0.8, chromaLight = 0.9 } = {}) {
  const { L, C, H } = hexToOklch(base);
  const mid = (steps - 1) / 2;
  return Array.from({ length: steps }, (_, i) => {
    const t = (i - mid) / Math.max(1, mid);                  // -1 어둠 → +1 밝음
    const c = C * (t < 0 ? 1 + (chromaDark - 1) * -t : 1 + (chromaLight - 1) * t);
    return oklch(Math.max(0.05, Math.min(0.98, L + (i - mid) * dL)), c, (H + (hueShift / 2) * t + 360) % 360);
  });
}

/** 공식 텍스처식 결: 고립 픽셀 비율 rate(5~15%)만큼 ±1단계 흔들기(결정적 해시) */
export const grain = (rate = 0.1, seed = 1) => (x, y) => {
  const h = (((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) >>> 0) % 1000 / 1000;
  return h < rate / 2 ? -1 : h > 1 - rate / 2 ? 1 : 0;
};
