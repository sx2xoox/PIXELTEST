// B1 "고요" 앱 아이콘 — 콘셉트: 잔잔한 수면 위 초승달(숨을 고른 밤).
// 원칙: 요소 3개 이하(달·반사·물결), 차가운 밤 vs 따뜻한 달(온도 대비 = 초점), 24px 실루엣 우선.
function crescent(cx, cy, R, ox, oy, r) {
  // 바깥 원(cx,cy,R)에서 안쪽 원(cx+ox, cy+oy, r)을 뺀 초승달: 두 원의 교점을 계산해 호 두 개로 그린다
  const dx = ox, dy = oy, d = Math.hypot(dx, dy);
  const a = (R * R - r * r + d * d) / (2 * d), h = Math.sqrt(R * R - a * a);
  const mx = cx + (a * dx) / d, my = cy + (a * dy) / d;
  const p1 = [mx + (h * dy) / d, my - (h * dx) / d], p2 = [mx - (h * dy) / d, my + (h * dx) / d];
  return `M${p1[0].toFixed(1)},${p1[1].toFixed(1)} A${R},${R} 0 1 0 ${p2[0].toFixed(1)},${p2[1].toFixed(1)} A${r},${r} 0 0 1 ${p1[0].toFixed(1)},${p1[1].toFixed(1)} Z`;
}

export default function () {
  const moon = crescent(470, 430, 230, 120, -70, 205);
  return {
    width: 1024, height: 1024,
    palette: { seed: '#3f51b5', harmony: 'analogous' },
    tokens: { cream: '#f6e7c1', warm: '#ffd59a' },
    background: '#ffffff',
    post: { grain: 0.035 }, // r2: 스톡 일러스트 같은 매끈함을 줄이는 아주 약한 질감
    critic: { safeMargin: 0.02 },
    children: [{
      type: 'group', clip: { type: 'squircle', x: 64, y: 64, w: 896, h: 896, n: 5 },
      children: [
        { type: 'rect', x: 0, y: 0, w: 1024, h: 1024, fill: { linear: { angle: 90, stops: [[0, '$primary.950'], [0.62, '$primary.800'], [1, '$secondary.700']] } } },
        // 달빛 후광(넓고 약하게)
        { type: 'circle', cx: 470, cy: 430, r: 360, fill: { radial: { stops: [[0, '$warm', 0.22], [1, '$warm', 0]] } }, blend: 'screen' },
        { type: 'path', d: moon, fill: '$cream', shade: { light: 210, strength: 0.55, spec: 0.15, shadow: '#7a5a3a' },
          effects: [{ type: 'glow', blur: 40, color: '$warm', opacity: 0.55 }] },
        // 수면
        { type: 'rect', x: 0, y: 720, w: 1024, h: 304, fill: { linear: { angle: 90, stops: [[0, '$primary.900'], [1, '$primary.950']] } } },
        // v2: 막대 반복은 '메뉴 아이콘'처럼 보임 → 길이·위치가 불규칙하고 아래로 갈수록 가늘고 흐린 붓 획.
        //     정렬 기준은 원 중심(470)이 아니라 초승달의 실제 덩어리(x≈395)
        // r2: 작은 크기에서 뭉개지지 않게 굵고 4줄로
        ...[[0, 270, 14, 0.9], [1, 200, 11, 0.75], [2, 140, 9, 0.6], [3, 90, 7, 0.45]].map(([i, w, t, op]) => {
          const cx = 395 + [0, 14, -10, 8, -4][i], y = 752 + i * 36;
          return { type: 'brush', points: [[cx - w / 2, y], [cx, y - 3], [cx + w / 2, y + 1]], width: t, taper: 0.9, fill: i < 2 ? '$cream' : '$warm', opacity: op };
        }),
        // r2: 달이 왼쪽 위로 쏠린 무게를 받쳐 줄 '먼 섬' 실루엣(오른쪽 수평선, 낮은 대비 = 대기원근)
        // r2-b: 능선(ridge)은 시작점이 수직으로 잘림 → 양 끝이 수평선으로 완만히 내려오는 곡선 섬
        { type: 'curve', closed: true, points: [[560, 722], [640, 708], [720, 690], [790, 684], [850, 694], [900, 712], [930, 722]], fill: '$primary.800', opacity: 0.8 },
        { type: 'curve', closed: true, points: [[700, 722], [780, 700], [860, 668], [930, 656], [990, 666], [1040, 690], [1040, 722]], fill: '$primary.900' },
        // 수평선: 딱딱한 선 대신 아주 옅은 빛 띠
        { type: 'rect', x: 0, y: 712, w: 1024, h: 14, fill: { linear: { angle: 90, stops: [[0, '$secondary.300', 0], [0.5, '$secondary.300', 0.35], [1, '$secondary.300', 0]] } } },
        { type: 'star', cx: 730, cy: 300, r: 22, inner: 0.32, points: 4, fill: '#ffffff', opacity: 0.9 },
        { type: 'star', cx: 800, cy: 430, r: 12, inner: 0.32, points: 4, fill: '#ffffff', opacity: 0.6 },
      ],
    }],
  };
}
