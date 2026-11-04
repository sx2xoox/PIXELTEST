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
