// B2 "제3회 한강 야간 독서회" — 콘셉트: 펼친 책에서 빛의 강이 흘러나와 밤의 한강이 된다.
// 색: 깊은 남색 + 독서등 호박색 하나(강조는 한 색만). 타이포: 라벨 / 큰 제목 / 정보 3단 위계, 왼쪽 정렬.
export default function () {
  const W = 1080, H = 1350, M = 84;
  const bx = 540, by = 790; // v2: 책을 아래로(책과 제목 사이 죽은 공간 제거) + 크게
  const K = 1.25;
  const page = side => {
    const s = side; // -1 왼쪽, +1 오른쪽
    const k = K;
    return `M${bx},${by} C${bx + s * 70 * k},${by - 34 * k} ${bx + s * 180 * k},${by - 34 * k} ${bx + s * 262 * k},${by - 12 * k} L${bx + s * 262 * k},${by - 190 * k} C${bx + s * 180 * k},${by - 214 * k} ${bx + s * 70 * k},${by - 214 * k} ${bx},${by - 176 * k} Z`;
  };
  // v2: 빛의 강 — 탁한 반투명 호박색(갈색 리본처럼 보임) 대신 밝은 심 + 발광 + screen, 위로 갈수록 여러 가닥으로 퍼짐
  const top = by - 176 * K;
  const strand = (spread, w, col, op, seed) => ({
    type: 'brush', seed, jitter: 0.08,
    points: [[bx, top + 6], [bx + 30 + spread * 0.3, top - 100], [bx - 50 + spread * 0.8, top - 210], [bx + 50 + spread * 1.4, top - 330], [bx + 120 + spread * 2.2, top - 470]], // r2: 프레임 안(y≥60)에서 끝나게
    width: [w * 0.6, w, w * 0.5], taper: 0.95, fill: col, opacity: op, blend: 'screen', // v3: 양 끝을 가늘게 → 하늘로 녹아듦
    effects: [{ type: 'glow', blur: 18, color: '#ffb347', opacity: 0.8 }],
  });
  return {
    width: W, height: H,
    palette: { seed: '#1d3a8a', harmony: 'complementary' },
    tokens: { amber: '#ffb347', paper: '#f7ecd6', night: '#0a1230' },
    background: { linear: { angle: 90, stops: [[0, '#070b20'], [0.55, '$night'], [1, '#101a40']] } },
    post: { grain: 0.06, vignette: 0.35 },
    children: [
      // 별(크기·밝기 범위로 깊이)
      { type: 'scatter', seed: 21, count: 60, area: { x: 0, y: 0, w: W, h: 520 }, scale: [0.3, 1], opacity: [0.25, 0.9], child: { type: 'circle', cx: 0, cy: 0, r: 3, fill: '#ffffff' } },
      // 수평선의 도시: 낮은 대비(대기원근) + 작은 창 불빛
      { type: 'ridge', w: W, y: 470, bottom: 560, amp: 6, freq: 1, seed: 3, fill: '#16224f' },
      // r2: 납작한 한 줄 띠 → 먼 층(옅고 높게) + 가까운 층(진하고 낮게) 2겹, 높이 변화를 크게
      ...Array.from({ length: 16 }, (_, i) => {
        const x = i * 70 + ((i * 29) % 31), h = 50 + ((i * 47) % 110);
        return { type: 'rect', x, y: 500 - h, w: 40 + ((i * 13) % 26), h: h + 40, fill: '#1a2758', opacity: 0.8 };
      }),
      ...Array.from({ length: 24 }, (_, i) => {
        const x = i * 46 + ((i * 37) % 19), h = 16 + ((i * 53) % 46);
        return { type: 'rect', x, y: 512 - h, w: 30 + ((i * 11) % 16), h: h + 20, fill: '#111a40' };
      }),
      { type: 'scatter', seed: 8, count: 40, area: { x: 10, y: 440, w: W - 20, h: 60 }, scale: [0.6, 1], opacity: [0.35, 0.85], child: { type: 'rect', x: 0, y: 0, w: 4, h: 5, fill: '$amber' } },
      // 강물(수평선 아래)
      { type: 'rect', x: 0, y: 520, w: W, h: 420, fill: { linear: { angle: 90, stops: [[0, '#0d1838'], [1, '$night']] } } },
      // 책: 그림자 → 페이지(입체) → 빛
      { type: 'ellipse', cx: bx, cy: by + 10, rx: 360, ry: 26, fill: '#000000', opacity: 0.45, effects: [{ type: 'blur', r: 14 }] },
      { type: 'circle', cx: bx, cy: by - 160, r: 340, fill: { radial: { stops: [[0, '$amber', 0.35], [1, '$amber', 0]] } }, blend: 'screen' },
      { type: 'path', d: page(-1), fill: '$paper', shade: { light: 300, strength: 0.5, spec: 0.1, shadow: '#7a5230' } },
      { type: 'path', d: page(1), fill: '$paper', shade: { light: 240, strength: 0.5, spec: 0.1, shadow: '#7a5230' } },
      // 글줄(페이지 위의 아주 옅은 선) — 책으로 읽히게 하는 디테일
      ...[0, 1, 2, 3, 4].flatMap(i => [-1, 1].map(s => ({ type: 'brush', points: [[bx + s * 50, by - 190 + i * 32], [bx + s * 175, by - 202 + i * 32], [bx + s * 275, by - 190 + i * 32]], width: 3, taper: 0.3, fill: '#b9a27e', opacity: 0.55 }))),
      { type: 'line', points: [[bx, top], [bx, by]], stroke: { color: '#8a6440', width: 3 } },
      // v3: 넓고 흐린 빛 번짐을 바탕에 깔고(빛의 '부피'), 가닥은 밝은 색만 — 탁한 호박색 가닥 제거
      { ...strand(10, 70, '#ffb347', 0.35, 9), effects: [{ type: 'blur', r: 22 }] },
      strand(-50, 12, '#ffd88a', 0.8, 1),
      strand(0, 14, '#ffe3a3', 0.9, 2),
      strand(70, 10, '#ffe7b0', 0.7, 3),
      strand(20, 5, '#fffaf0', 1, 4),
      { type: 'scatter', seed: 5, count: 34, area: { x: bx - 120, y: top - 600, w: 520, h: 560 }, scale: [0.4, 1.2], opacity: [0.4, 1], child: { type: 'star', cx: 0, cy: 0, r: 7, inner: 0.35, points: 4, fill: '#fff3d6' } },
      // 물 위 반사(책의 빛이 강에 비친다)
      ...[0, 1, 2, 3].map(i => ({ type: 'brush', points: [[bx - 150 + i * 20, by + 40 + i * 26], [bx + (i % 2 ? 10 : -10), by + 37 + i * 26], [bx + 150 - i * 24, by + 41 + i * 26]], width: 6 - i, taper: 0.9, fill: '$amber', opacity: 0.55 - i * 0.1, blend: 'screen' })),

      // 텍스트(아래 블록, 왼쪽 정렬)
      { type: 'stack', x: M, y: H - M, w: W - M * 2, anchor: 'bottom', align: 'center', gap: 18, children: [ // r2: 중앙 일러스트와 축을 맞춰 중앙 정렬
        { type: 'text', text: '제3회 · HANGANG NIGHT READING', size: 26, weight: 700, letterSpacing: 1.6, fill: '$amber' }, // r2: 자간 3 → 1.6
        { type: 'text', text: '한강 야간 독서회', size: 128, weight: 800, lineHeight: 1.05, fill: '#f4f1ea', gapBefore: 10, fit: { maxLines: 1, minSize: 90 } },
        { type: 'rect', h: 2, w: 120, fill: '$amber', gapBefore: 34 }, // r2: 전폭 선 → 짧은 중앙 포인트 선
        { type: 'text', text: '2026.9.19 토  19:00 — 23:00', size: 40, weight: 700, fill: '#f4f1ea', gapBefore: 30 },
        { type: 'text', text: '여의도 한강공원 물빛광장', size: 32, weight: 500, fill: '#aab4d8' },
        { type: 'text', text: '무료 참가 · 담요를 챙겨 오세요', size: 28, weight: 600, fill: '$amber', gapBefore: 14 },
      ] },
    ],
  };
}
