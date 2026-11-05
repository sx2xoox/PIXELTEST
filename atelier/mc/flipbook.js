// 공식 파티클 플립북 문법을 따르는 텍스처 생성기 (docs/research/minecraft-official-study.md)
//  · 작은 해상도(8~32px) · 흰색 1~3단 명도 · 컷아웃(반투명 번짐 없음) — 색은 이미터의 colors(수명 그라데이션)가 입힌다
//  · 타격 프레임: 맞는 순간 꽉 찬 실루엣 1프레임 / 소멸: 흐려지지 않고 '조각나며' 사라진다 / 예비: 안으로 수렴
import { PixelCanvas } from '../pixel.js';

const W = '#ffffff', G = '#c8c8c8', D = '#8e8e8e';          // 3단 명도(틴트를 곱하면 밝음·중간·어둠)
const frameset = (n, fn, size) => Array.from({ length: n }, (_, k) => { const c = new PixelCanvas(size); fn(c, k, n); return c; });
const ringPx = (c, cx, cy, r, w, col, keep = () => true) => {
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
    if (Math.abs(d - r) <= w / 2 && keep(Math.atan2(dy, dx))) c.set(x, y, col);
  }
};
const disc = (c, cx, cy, r, col) => { for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) c.set(x, y, col); };

/** 타격 플립북(기본 32px × 14프레임): 수렴 조각(0~4) → 점(5) → 꽉 찬 원(6, 타격) → 이중 고리 확장(7~10) → 고리 조각화(11~13) */
export function impact({ size = 32, frames = 14, arms = 6 } = {}) {
  const h = size / 2;
  return frameset(frames, (c, k) => {
    if (k <= 4) {                                             // 예비: 조각 6개가 회전하며 안으로
      const t = k / 4, r = size * (0.44 - 0.32 * t), len = 0.5 - 0.25 * t;
      for (let i = 0; i < arms; i++) { const a0 = (i / arms) * Math.PI * 2 + t * 1.6; ringPx(c, h, h, r, 1.6, i % 2 ? G : W, a => { const d = ((a - a0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); return d < len; }); }
    } else if (k === 5) disc(c, h, h, size * 0.07, W);
    else if (k === 6) { disc(c, h, h, size * 0.44, W); disc(c, h, h, size * 0.16, G); }   // 타격: 꽉 찬 원(가운데 한 단 어둡게 → 납작하지 않게)
    else if (k <= 10) {                                       // 이중 고리: 바깥 굵음 → 가늘어짐
      const t = (k - 7) / 3;
      ringPx(c, h, h, size * (0.3 + 0.16 * t), Math.max(1, 3.2 - 2 * t), W);
      ringPx(c, h, h, size * (0.18 + 0.12 * t), 1, G);
    } else {                                                  // 조각화: 고리를 끊고 끊긴 틈이 점점 커짐
      const t = (k - 10) / (frames - 11 || 1), gap = 0.35 + 0.55 * t;
      ringPx(c, h, h, size * 0.47, 1, t < 0.6 ? W : G, a => ((a + Math.PI) / (Math.PI / 4)) % 1 > gap);
    }
  }, size);
}

/** 불티(8px × 6): 4갈래 별 → 점점 작아짐 → 점 */
export function spark({ size = 8, frames = 6 } = {}) {
  const h = size / 2;
  return frameset(frames, (c, k, n) => {
    const L = Math.max(0, Math.round((h - 0.5) * (1 - k / n)));
    c.set(h, h, W); c.set(h - 1, h, W); c.set(h, h - 1, W); c.set(h - 1, h - 1, W);
    for (let i = 1; i <= L; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.set(Math.round(h - 0.5 + dx * (i + 0.5)), Math.round(h - 0.5 + dy * (i + 0.5)), i === L ? G : W);
  }, size);
}

/** 파편(8px × 4): 비대칭 삼각 조각이 회전(프레임마다 90°) — 깨진 집기·결정 */
export function shard({ size = 8, frames = 4 } = {}) {
  const base = new PixelCanvas(size).chars(0, 0, ['........', '..W.....', '..WW....', '..WGW...', '..WGGW..', '..DGGGW.', '..DDDDD.', '........'], { W, G, D });
  return Array.from({ length: frames }, (_, k) => { let c = base; for (let i = 0; i < k; i++) c = c.rotate90(); return c; });
}

/** 연기 덩어리(16px × 8): 꽉 찬 덩어리 → 가운데 비며 고리 → 끊긴 호 → 사라짐 */
export function puff({ size = 16, frames = 8, seed = 1 } = {}) {
  const h = size / 2;
  return frameset(frames, (c, k, n) => {
    const t = k / (n - 1), r = size * (0.22 + 0.24 * t);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - h, dy = y + 0.5 - h, a = Math.atan2(dy, dx);
      const rr = r * (1 + 0.15 * Math.sin(a * 3 + seed + t * 2));
      const d = Math.hypot(dx, dy);
      const inner = rr * Math.max(0, t * 1.25 - 0.25);                // 시간이 갈수록 가운데가 빔
      if (d > rr || d < inner) continue;
      if (t > 0.6 && ((a + Math.PI) / (Math.PI / 3) + seed) % 1 < (t - 0.6) * 2.2) continue;   // 끝에는 호가 끊김
      c.set(x, y, d > rr - 1.2 ? G : dy < -rr * 0.3 ? W : G);
    }
  }, size);
}

/** 점(4px × 1): 가장 작은 기본 입자 */
export const mote = ({ size = 4 } = {}) => [new PixelCanvas(size).rect(1, 1, 2, 2, W)];
