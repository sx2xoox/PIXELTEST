// B4 이끼 낀 석재 벽돌 (16×16, 타일링) — r2
// 평가 지적: 벽돌 질서 붕괴, 이끼 과다, 하이라이트 줄이 반복 패턴으로 튐.
// r2 원칙: ① 구조(줄눈)를 먼저 확정하고 끝까지 연속시킨다 — 이끼가 덮어도 '어두운 이끼'라 선이 유지된다
//          ② 벽돌 명도 차이는 미세하게(2단계), 하이라이트는 줄 전체가 아니라 왼쪽 위 모서리 몇 픽셀
//          ③ 이끼는 30% 이하, 아래쪽 줄눈(물 고임)과 벽돌 아랫부분에서 위로 번지게
import { PixelCanvas, pixelRamp, tileNoise } from '../../atelier/pixel.js';
import { rng } from '../../atelier/geom.js';

export default () => {
  const c = new PixelCanvas(16);
  const stone = pixelRamp('#8f9398', 5, { spread: 0.05, hueShift: 8, chroma: 0.5 });
  const mortar = '#55585d';
  const moss = pixelRamp('#4d7d33', 4, { spread: 0.055, hueShift: 22 });
  const n = tileNoise(16, 16, { cell: 4, seed: 12, octaves: 2 });
  const R = rng(4);
  const bh = 4, bw = 8, tone = {};
  const info = (x, y) => {
    const row = Math.floor(y / bh), off = row % 2 ? bw / 2 : 0;
    return { row, lx: (x + off) % bw, ly: y % bh, id: `${row}:${Math.floor((x + off) / bw) % 2}` };
  };
  c.each((x, y) => {
    const { lx, ly, id } = info(x, y);
    if (ly === bh - 1 || lx === bw - 1) return c.set(x, y, mortar);
    tone[id] ??= 2 + (R() < 0.4 ? -1 : R() < 0.3 ? 1 : 0); // 대부분 같은 톤, 일부만 한 단계 차이
    let t = tone[id];
    if (ly === 0 && lx < 3) t = Math.min(4, t + 1);          // 왼쪽 위 모서리만 밝게
    if (ly === bh - 2 && lx > 3) t = Math.max(0, t - 1);    // 아래 오른쪽 그림자
    c.set(x, y, stone[t]);
  });
  // 미세한 표면 흠(벽돌마다 1~2개, 규칙 반복 피함)
  for (let k = 0; k < 6; k++) { const x = Math.floor(R() * 16), y = Math.floor(R() * 16); const { lx, ly } = info(x, y); if (ly < bh - 1 && lx < bw - 1) c.set(x, y, stone[1]); }
  // 이끼: 아래쪽 줄눈에서 시작해 벽돌 아랫부분으로 번짐
  c.each((x, y) => {
    const { lx, ly } = info(x, y);
    const v = n[y * 16 + x];
    const isMortar = ly === bh - 1 || lx === bw - 1;
    const site = isMortar ? (ly === bh - 1 ? 0.56 : 0.66) : ly === bh - 2 ? 0.7 : 0.82;
    if (v <= site) return;
    if (isMortar) c.set(x, y, moss[v > site + 0.12 ? 1 : 0]);        // 줄눈 위 이끼는 어둡게 → 선 유지
    else c.set(x, y, moss[v > site + 0.12 ? 3 : v > site + 0.05 ? 2 : 1]);
  });
  return [{ name: 'mossy_stone_bricks', kind: 'block', canvas: c }];
};
