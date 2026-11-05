// 인벤토리 칸 맞춤(16×16) — 바닐라 item/*.png 823종 실측(docs/research/slot-fit.md)
//  · 질량 중심: 가로 ±0.5px 안(좌우 대칭 아이템은 정확히 0), 세로 0 ~ +1(바닥에 놓인 듯 약간 아래)
//  · 경계상자: 재료 12~14(작은 조각 8까지 의도적으로), 갑옷 10~14, 도구·막대(대각선) 13~16
//  · 여백: 최소 1px(도구·주괴는 모서리 0 허용), 갑옷은 2~3px — 칸 테두리에 붙으면 답답해 보인다
//  · 채움(불투명 비율): 재료 0.3~0.55, 갑옷 0.3~0.55, 도구 0.2~0.35(가는 대각선), 막대 0.14~0.27
import { PixelCanvas } from '../pixel.js';

export const FIT = {
  material: { box: [11, 15], fill: [0.28, 0.58], cy: [-0.5, 1.2], margin: 1, target: [0, 0.4] },
  small: { box: [7, 11], fill: [0.12, 0.35], cy: [-0.5, 1.2], margin: 2, target: [0, 0.3] },
  rod: { box: [12, 15], fill: [0.12, 0.3], cy: [-0.7, 0.7], margin: 1, target: [0, 0] },
  tool: { box: [13, 16], fill: [0.18, 0.4], cy: [-1, 0.6], margin: 0, target: [0.3, -0.3] },
  helmet: { box: [10, 13], fill: [0.25, 0.45], cy: [-0.7, 0.6], margin: 2, target: [0, -0.4] },
  chestplate: { box: [13, 15], fill: [0.4, 0.6], cy: [-0.5, 0.5], margin: 1, target: [0, 0] },
  leggings: { box: [10, 13], fill: [0.3, 0.5], cy: [-0.6, 0.4], margin: 2, target: [0, -0.2] },
  boots: { box: [12, 15], fill: [0.25, 0.42], cy: [-0.2, 1.0], margin: 1, target: [0, 0.4] },
};

/** 칸 맞춤 측정: 경계상자·여백·질량 중심(칸 중심 7.5 기준)·채움 */
export function measureFit(c) {
  let n = 0, sx = 0, sy = 0, x0 = 16, x1 = -1, y0 = 16, y1 = -1;
  c.each((x, y) => { if (!c.get(x, y)) return; n++; sx += x; sy += y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
  if (!n) return null;
  return { w: x1 - x0 + 1, h: y1 - y0 + 1, box: Math.max(x1 - x0, y1 - y0) + 1, l: x0, r: c.w - 1 - x1, t: y0, b: c.h - 1 - y1,
    cx: +(sx / n - (c.w - 1) / 2).toFixed(2), cy: +(sy / n - (c.h - 1) / 2).toFixed(2), fill: +(n / (c.w * c.h)).toFixed(2) };
}

/** 기준 대비 문제 목록 */
export function checkFit(c, kind = 'material') {
  const f = measureFit(c), T = FIT[kind], out = [];
  if (!f) return ['빈 아이콘'];
  if (f.box < T.box[0] || f.box > T.box[1]) out.push(`크기 ${f.box}px (기준 ${T.box.join('~')})`);
  if (f.fill < T.fill[0] || f.fill > T.fill[1]) out.push(`채움 ${f.fill} (기준 ${T.fill.join('~')})`);
  if (Math.abs(f.cx - T.target[0]) > 0.75) out.push(`가로 중심 ${f.cx > 0 ? '+' : ''}${f.cx}`);
  if (f.cy < T.cy[0] || f.cy > T.cy[1]) out.push(`세로 중심 ${f.cy > 0 ? '+' : ''}${f.cy} (기준 ${T.cy.join('~')})`);
  if (Math.min(f.l, f.r, f.t, f.b) < T.margin) out.push(`여백 ${Math.min(f.l, f.r, f.t, f.b)}px (기준 ≥${T.margin})`);
  return out;
}

/**
 * 칸에 앉히기: 정수 픽셀 이동만 한다(픽셀아트는 크기를 바꾸면 깨지므로 크기 문제는 그리는 쪽에서 고친다).
 * 질량 중심을 기준 위치로 옮기되 여백 기준을 넘지 않게 자른다.
 */
export function slotShift(c, kind = 'material') {
  const f = measureFit(c), T = FIT[kind];
  if (!f) return [0, 0];
  let dx = Math.round(T.target[0] - f.cx), dy = Math.round(T.target[1] - f.cy);
  const m = T.margin;
  dx = Math.max(m - f.l, Math.min(f.r - m, dx)); dy = Math.max(m - f.t, Math.min(f.b - m, dy));
  if (f.l + f.r < 2 * m) dx = Math.round((f.r - f.l) / 2);              // 여백을 다 못 지키면 좌우 균등
  if (f.t + f.b < 2 * m) dy = Math.round((f.b - f.t) / 2);
  return [dx, dy];
}
export function placeInSlot(c, kind = 'material') {
  const [dx, dy] = slotShift(c, kind);
  if (!dx && !dy) return c;
  const o = new PixelCanvas(c.w, c.h);
  c.each((x, y) => { const v = c.get(x, y); if (v) o.set(x + dx, y + dy, v); });
  return o;
}
