// JS 장면: 반복/계산이 필요한 디자인은 코드로 생성한다.
export default function () {
  const W = 1080, H = 1350;
  const rings = Array.from({ length: 9 }, (_, i) => ({
    type: 'circle', cx: 760, cy: 470, r: 90 + i * 46,
    fill: 'none', stroke: { color: i % 2 ? '$primary.300' : '$accent.400', width: 3 + (8 - i) * 1.4 }, opacity: 1 - i * 0.09,
  }));
  return {
    width: W, height: H,
    palette: { seed: '#e8590c', harmony: 'split' },
    background: '$neutral.50',
    post: { grain: 0.06 },
    children: [
      ...rings,
      { type: 'blob', cx: 760, cy: 470, r: 150, points: 7, wobble: 0.18, seed: 3, fill: '$primary.500', shade: { light: 230, strength: 0.7 } },
      { type: 'text', x: 80, y: 900, size: 132, weight: 800, text: '소리의 밤', fill: '$neutral.900' },
      { type: 'text', x: 84, y: 980, size: 34, weight: 500, text: '2026 서울 앰비언트 사운드 페스티벌', fill: '$neutral.500' },
      { type: 'rect', x: 84, y: 1040, w: 912, h: 2, fill: '$neutral.300' },
      { type: 'text', x: 84, y: 1110, size: 28, weight: 600, text: '11.21 — 11.23', fill: '$primary.400' },
      { type: 'text', x: 84, y: 1160, size: 22, weight: 400, maxWidth: 520, text: '문화비축기지 T2 · 오후 6시부터 자정까지 · 사전 예약 필수', fill: '$neutral.400' },
    ],
  };
}
