// v1 비평 반영: 명도 구조(어두운 밤 배경), 텍스트 대비, 고아 단어, 하단 여백 활용
export default function () {
  const W = 1080, H = 1350, cx = 700, cy = 500;
  const rings = Array.from({ length: 10 }, (_, i) => ({
    type: 'circle', cx, cy, r: 120 + i * 52, fill: 'none',
    stroke: { color: i % 3 === 0 ? '$primary.400' : '$secondary.300', width: Math.max(1.5, 7 - i * 0.6) },
    opacity: 0.85 - i * 0.075,
  }));
  return {
    width: W, height: H,
    palette: { seed: '#e8590c', harmony: 'split' },
    background: { linear: { angle: 90, stops: [[0, '$secondary.950'], [1, '#07060d']] } },
    post: { grain: 0.07, vignette: 0.4 },
    children: [
      { type: 'circle', cx, cy, r: 420, fill: { radial: { stops: [[0, '$primary.500', 0.35], [1, '$primary.500', 0]] } }, blend: 'screen' },
      ...rings,
      { type: 'blob', cx, cy, r: 160, points: 7, wobble: 0.16, seed: 3, fill: '$primary.500',
        shade: { light: 230, strength: 0.8, rim: '$secondary.200' },
        effects: [{ type: 'glow', blur: 60, color: '$primary.400', opacity: 0.6 }] },
      { type: 'text', x: 80, y: 960, size: 150, weight: 800, text: '소리의 밤', fill: '$neutral.50' },
      { type: 'text', x: 86, y: 1040, size: 34, weight: 500, text: '2026 서울 앰비언트 사운드 페스티벌', fill: '$neutral.200' },
      { type: 'rect', x: 86, y: 1092, w: 908, h: 2, fill: '$neutral.700' },
      { type: 'text', x: 86, y: 1170, size: 44, weight: 700, text: '11.21 — 11.23', fill: '$primary.300' },
      { type: 'text', x: 994, y: 1150, size: 24, weight: 400, align: 'right', lines: ['문화비축기지 T2', '오후 6시 — 자정 · 사전 예약 필수'], fill: '$neutral.300' },
    ],
  };
}
