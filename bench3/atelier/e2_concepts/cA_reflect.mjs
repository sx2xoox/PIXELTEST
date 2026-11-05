// Concept A: type-as-image — 제목 "독서회"가 수평선에 앉고 강물에 반영(물결 조각)으로 비친다
export default function () {
  const W = 1080, H = 1350, HZ = 780, S = 230;
  const title = (y, extra = {}) => ({ type: 'text', x: 40, y, text: '독서회', size: S, weight: 800, font: 'NanumMyeongjo', letterSpacing: -0.04 * S, fill: '#f3e6c4', ...extra });
  const strips = [];
  let y = HZ + 4, i = 0;
  while (y < HZ + 300) {
    const h = 6 + i * 1.3, dx = [0, 14, -10, 22, -18, 8, -26, 16, -6, 30, -20, 12][i % 12];
    strips.push({ type: 'group', clip: { type: 'rect', x: 0, y, w: W, h: h * 0.62 }, children: [title(HZ, { transform: `translate(${dx},${2 * HZ}) scale(1,-1)`, fill: '#e9b86a', opacity: Math.max(0.15, 0.85 - i * 0.05) })] });
    y += h; i++;
  }
  return {
    width: W, height: H, background: '#0b1330',
    post: { grain: 0.05 },
    children: [
      { type: 'rect', x: 0, y: HZ, w: W, h: H - HZ, fill: '#0e1a42' },
      { type: 'text', x: 40, y: HZ - S * 1.02, text: '한강 야간', size: S, weight: 800, font: 'NanumMyeongjo', letterSpacing: -0.04 * S, fill: '#f3e6c4' },
      title(HZ - 8),
      ...strips,
      { type: 'circle', cx: 900, cy: 200, r: 38, fill: '#ffb347' },
      { type: 'text', x: 72, y: 150, text: '제3회', size: 34, weight: 700, font: 'Pretendard', fill: '#ffb347' },
      { type: 'stack', x: 72, y: H - 72, w: 700, anchor: 'bottom', gap: 10, children: [
        { type: 'text', text: '2026.9.19(토) 19:00–23:00', size: 40, weight: 700, font: 'Pretendard', fill: '#f3e6c4' },
        { type: 'text', text: '여의도 한강공원 물빛광장', size: 32, weight: 500, font: 'Pretendard', fill: '#9fb0dc' },
        { type: 'text', text: '무료 · 담요 지참', size: 32, weight: 500, font: 'Pretendard', fill: '#9fb0dc' },
      ] },
    ],
  };
}
