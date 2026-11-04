// 반응형 장면: 하나의 함수로 SNS 규격 여러 개를 만든다.
//   node atelier/cli.js render examples/market.mjs --formats square,portrait,story,landscape --out out
// 규칙: 가로형이면 그림 오른쪽 / 글 왼쪽, 세로형이면 그림 위 / 글 아래. 크기는 짧은 변(u) 기준 상대값.
export default function ({ width = 1080, height = 1350 } = {}) {
  const W = width, H = height, u = Math.min(W, H) / 100;
  const wide = W / H > 1.2;
  const tall = H / W > 1.5;
  const M = 7 * u; // 바깥 여백
  // 그림 영역
  const art = wide ? { x: W * 0.5, y: 0, w: W * 0.5, h: H } : { x: 0, y: 0, w: W, h: H * (H / W > 1.5 ? 0.55 : 0.5) };
  const cx = art.x + art.w / 2, cy = art.y + art.h * 0.56, R = Math.min(art.w, art.h) * 0.36;

  const leaf = (x, y, r, rot, tone) => ({
    type: 'blob', cx: x, cy: y, rx: r * 0.55, ry: r, points: 6, wobble: 0.08, seed: Math.round(x + y),
    rotate: 0, transform: `rotate(${rot},${x},${y})`, fill: tone, shade: { light: 300, strength: 0.6, spec: 0.2 },
  });
  const plant = (x, y, s, seed) => ({
    type: 'group', children: [
      { type: 'brush', points: [[x, y], [x - 4 * s, y - 40 * s], [x + 2 * s, y - 80 * s]], width: [6 * s, 4 * s, 2 * s], taper: 0.4, fill: '$secondary.800' },
      leaf(x - 18 * s, y - 50 * s, 22 * s, -40, '$secondary.500'),
      leaf(x + 16 * s, y - 70 * s, 20 * s, 35, '$secondary.400'),
      leaf(x - 6 * s, y - 92 * s, 16 * s, -10, '$secondary.300'),
    ].map(c => ({ ...c, seed })),
  });
  const s = R / 140;

  const textX = wide ? M : M;
  const textW = wide ? W * 0.5 - M * 1.6 : W - M * 2;
  const bottom = H - M;

  return {
    width: W, height: H,
    palette: { seed: '#d9480f', harmony: 'triadic' },
    tokens: { paper: '#f6efe3', ink: '#24201c' },
    background: '$paper',
    post: { grain: 0.05 },
    children: [
      // 해 + 언덕 + 화분 일러스트
      { type: 'circle', cx: cx + R * 0.55, cy: cy - R * 0.65, r: R * 0.42, fill: '$primary.300', opacity: 0.9 },
      { type: 'group', clip: { type: 'rect', x: art.x, y: art.y, w: art.w, h: art.h },
        children: [{ type: 'ridge', x: art.x - 10, w: art.w + 20, y: cy + R * 0.75, bottom: art.y + art.h + 10, amp: R * 0.12, freq: 1.2, seed: 4, fill: '$secondary.200' }] },
      { type: 'path', d: `M${cx - R * 0.55},${cy + R * 0.15} L${cx + R * 0.55},${cy + R * 0.15} L${cx + R * 0.42},${cy + R * 0.85} L${cx - R * 0.42},${cy + R * 0.85} Z`,
        fill: '$primary.500', shade: { light: 300, strength: 0.7 }, effects: [{ type: 'shadow', dy: 10 * s, blur: 18 * s, opacity: 0.25, color: '$primary.900' }] },
      { type: 'rect', x: cx - R * 0.6, y: cy + R * 0.08, w: R * 1.2, h: R * 0.16, r: 6 * s, fill: '$primary.600' },
      plant(cx - R * 0.2, cy + R * 0.12, s * 1.1, 1),
      plant(cx + R * 0.22, cy + R * 0.12, s * 0.9, 2),
      { type: 'scatter', seed: 9, count: 14, area: { x: art.x + art.w * 0.1, y: art.y + art.h * 0.08, w: art.w * 0.8, h: art.h * 0.4 },
        scale: [0.6, 1.2], opacity: [0.5, 0.9], child: { type: 'blob', cx: 0, cy: 0, rx: 5 * s, ry: 9 * s, points: 5, wobble: 0.1, fill: '$secondary.400' }, rotate: [-60, 60] },

      // 텍스트 블록: 아래(또는 왼쪽 세로 중앙)에서 위로 쌓는다
      // 세로로 긴 규격(스토리)은 그림 아래 남은 공간의 가운데에, 나머지는 아래 여백에 붙인다
      { type: 'stack', x: textX, y: wide ? H / 2 : tall ? (art.h + H) / 2 : bottom, w: textW, anchor: wide || tall ? 'middle' : 'bottom', gap: 2.2 * u,
        children: [
          { type: 'text', text: 'URBAN GARDEN MARKET', size: 2.6 * u, weight: 700, letterSpacing: 0.12 * 2.6 * u, fill: '$primary.700' },
          { type: 'text', text: '도시 정원 마켓 — 작은 화분에서 시작하는 봄', size: 9 * u, weight: 800, lineHeight: 1.12, balance: true, fit: { maxLines: 3, minSize: 6 * u }, fill: '$ink', gapBefore: 1.2 * u },
          { type: 'text', text: '씨앗 교환, 분갈이 클래스, 동네 농부들의 제철 채소. 화분 하나 들고 오시면 흙은 무료로 채워 드립니다.', size: 3.1 * u, weight: 400, lineHeight: 1.55, fill: '$neutral.700', gapBefore: 2.5 * u },
          { type: 'rect', h: 0.25 * u, fill: '$neutral.300', gapBefore: 3 * u },
          { type: 'text', text: '4.12 SAT — 4.13 SUN · 성수 연무장길 일대', size: 3.2 * u, weight: 700, fill: '$primary.700', gapBefore: 2.5 * u },
        ] },
    ],
  };
}
