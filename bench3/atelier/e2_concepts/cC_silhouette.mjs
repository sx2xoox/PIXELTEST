// Concept C: silhouette — 중명도 황혼 바탕, 담요 위에 누워 책 읽는 사람 실루엣 + 다리 아치, 책장만 빛난다
export default function () {
  const W = 1080, H = 1350, G = 1010;
  return {
    width: W, height: H, background: '#3e5d8f', post: { grain: 0.05 },
    children: [
      // bridge arches far
      ...[0, 1, 2, 3].map(i => ({ type: 'path', d: `M${-40 + i * 300},${G - 120} Q${110 + i * 300},${G - 230} ${260 + i * 300},${G - 120}`, fill: 'none', stroke: { color: '#2c4573', width: 10 } })),
      { type: 'rect', x: 0, y: G - 124, w: W, h: 10, fill: '#2c4573' },
      { type: 'rect', x: 0, y: G, w: W, h: H - G, fill: '#0c1428' },
      // blanket
      { type: 'path', d: `M120,${G} L980,${G} L1020,${G + 40} L80,${G + 40} Z`, fill: '#0c1428' },
      // reclining body: legs to right, torso propped on elbow left
      { type: 'curve', closed: true, fill: '#0c1428', points: [[260, G], [300, G - 120], [360, G - 170], [440, G - 150], [520, G - 70], [760, G - 60], [960, G - 40], [980, G]] },
      { type: 'circle', cx: 345, cy: G - 225, r: 52, fill: '#0c1428' },
      // book lit
      { type: 'path', d: `M430,${G - 210} L520,${G - 250} L540,${G - 170} L455,${G - 140} Z`, fill: '#ffd88a', effects: [{ type: 'glow', blur: 30, color: '#ffb347', opacity: 0.9 }] },
      { type: 'text', x: 72, y: 230, text: '한강 야간', size: 150, weight: 800, font: 'NanumMyeongjo', fill: '#0c1428' },
      { type: 'text', x: 72, y: 390, text: '독서회', size: 150, weight: 800, font: 'NanumMyeongjo', fill: '#0c1428' },
      { type: 'text', x: 76, y: 100, text: '제3회', size: 32, weight: 700, font: 'Pretendard', fill: '#0c1428' },
      { type: 'stack', x: 72, y: H - 72, w: 600, anchor: 'bottom', gap: 10, children: [
        { type: 'text', text: '2026.9.19(토) 19:00–23:00', size: 36, weight: 700, font: 'Pretendard', fill: '#f3e6c4' },
        { type: 'text', text: '여의도 한강공원 물빛광장 · 무료, 담요 지참', size: 28, weight: 500, font: 'Pretendard', fill: '#9fb0dc' },
      ] },
    ],
  };
}
