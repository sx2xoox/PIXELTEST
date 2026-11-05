// Concept B: geometric — 캔버스 밖 중심의 큰 달(원)이 수평선에 잘리고, 아래는 0.6배씩 얇아지는 동심 물결 호
export default function () {
  const W = 1080, H = 1350, HZ = 760, cx = 760, R = 420;
  const arcs = [];
  let w = 34, r = R + 40;
  for (let i = 0; i < 6; i++) { arcs.push({ type: 'circle', cx, cy: HZ, r, fill: 'none', stroke: { color: '#f3e6c4', width: w } }); r += w * 1.6 + 18; w *= 0.6; }
  return {
    width: W, height: H, background: '#0b1330', post: { grain: 0.05 },
    children: [
      { type: 'group', clip: { type: 'rect', x: 0, y: 0, w: W, h: HZ }, children: [{ type: 'circle', cx, cy: HZ, r: R, fill: '#f3e6c4' }] },
      { type: 'group', clip: { type: 'rect', x: 0, y: HZ + 14, w: W, h: H }, children: arcs.map(a => ({ ...a, stroke: { ...a.stroke, color: '#e9b86a' }, opacity: 0.8 })) },
      { type: 'rect', x: 0, y: HZ - 2, w: W, h: 4, fill: '#ffb347' },
      { type: 'text', x: 72, y: 140, text: '한강 야간 독서회', size: 72, weight: 800, font: 'NanumMyeongjo', fill: '#f3e6c4' },
      { type: 'text', x: 72, y: 196, text: '제3회 · 2026', size: 30, weight: 600, font: 'Pretendard', fill: '#ffb347' },
      { type: 'stack', x: 72, y: H - 72, w: 600, anchor: 'bottom', gap: 10, children: [
        { type: 'text', text: '2026.9.19(토) 19:00–23:00', size: 34, weight: 700, font: 'Pretendard', fill: '#f3e6c4' },
        { type: 'text', text: '여의도 한강공원 물빛광장', size: 28, weight: 500, font: 'Pretendard', fill: '#9fb0dc' },
        { type: 'text', text: '무료 · 담요 지참', size: 28, weight: 500, font: 'Pretendard', fill: '#9fb0dc' },
      ] },
    ],
  };
}
