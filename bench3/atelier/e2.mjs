// E2 「제3회 한강 야간 독서회」 — 콘셉트: 반영(反映). 글이 주인공(R1, 레시피 A).
// 제목 "독서회"가 수평선(강 건너편 둑) 위에 앉고, 그 글자가 밤의 한강에 물결 조각으로 비친다.
// 제목 자체가 도시의 불빛이자 강 풍경이 된다 — 중앙 스톡 일러스트 없이 글자 = 이미지.
// 시안 비교(e2_concepts/compare.png): A 반영(타입=이미지) / B 수평선 달+동심 물결호(스위스) / C 누워 읽는 사람 실루엣.
//   B는 결국 "수평선 위 해/달"이라는 흔한 그림, C는 실루엣 그림 품질이 약함 → A 선택(이 행사만의 장면, 글자와 이미지의 겹침 R10).
// 폰트: NanumMyeongjo ExtraBold(제목, 문학·밤 정서) + Pretendard(정보). 크기 3단계 250 / 40 / 30.
// 색: 밤 남색(바탕) · 종이빛 크림(잉크) · 호박색(독서등·달, 강조 ≤10%).
//
// r1: 시안 A를 정식화. 공유 왼쪽 축 AX=72, 수평선 HZ=800, 반영은 아래로 갈수록 띠가 두꺼워지고(원근) 틈·흔들림·투명도 증가.
//     9월 19일 실제 달(상현)을 오른쪽 위 보조 덩어리로, 그 반영은 불규칙 대시 기둥. 오른쪽 빈 수평선엔 저대비 여의도 스카이라인.
export default function () {
  const W = 1080, H = 1350, AX = 72, HZ = 800, S = 250;
  const C = { night: '#0a1230', water: '#0d1940', ink: '#f2e7cc', amber: '#ffb347', refl: '#e8b46a', dim: '#8f9ec8', far: '#16234f' };
  const TITLE = { size: S, weight: 800, font: 'NanumMyeongjo', letterSpacing: -0.045 * S };
  const t2 = (extra = {}) => ({ type: 'text', x: AX - 14, y: HZ, text: '독서회', ...TITLE, fill: C.ink, ...extra });

  // 반영: 수평선 기준 뒤집은 "독서회"를 가로 띠로 잘라 흔든다
  const rnd = (i, s = 1) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
  const strips = [];
  for (let y = HZ + 4, k = 0; y < HZ + 250; k++) {
    const h = 5 + k * 1.5, vis = Math.max(0.45, 0.95 - k * 0.03);
    const amp = 2 + k * 2.2, dx = (rnd(k) * 2 - 1) * amp;
    strips.push({ type: 'group', clip: { type: 'rect', x: 0, y, w: W, h: h * vis }, children: [
      t2({ transform: `translate(${dx.toFixed(1)},${2 * HZ}) scale(1,-1)`, fill: C.refl, opacity: Math.max(0.08, 0.78 - k * 0.045) }),
    ] });
    y += h;
  }
  // 물결 결(전폭, 불규칙 길이 — 균등 반복 금지 R12)
  const ripples = Array.from({ length: 14 }, (_, i) => {
    const y = HZ + 30 + i * i * 2.6 + rnd(i, 3) * 10, x = rnd(i, 5) * W * 0.9 - 40, len = 80 + rnd(i, 7) * 260;
    return { type: 'brush', points: [[x, y], [x + len / 2, y - 1], [x + len, y]], width: 2 + rnd(i, 9) * 2, taper: 0.9, fill: '#24346a', opacity: 0.7 };
  });
  // 달(상현) 반영: 불규칙 대시 기둥
  const MX = 900, MY = 210, MR = 44;
  const moonRefl = Array.from({ length: 9 }, (_, i) => {
    const y = HZ + 18 + i * (14 + i * 4), len = (70 - i * 6) * (0.6 + rnd(i, 11) * 0.6), x = MX + 12 + (rnd(i, 13) - 0.5) * 30;
    return { type: 'brush', points: [[x - len / 2, y], [x, y - 1], [x + len / 2, y]], width: Math.max(1.5, 6 - i * 0.6), taper: 0.9, fill: C.amber, opacity: 0.8 - i * 0.08 };
  });
  // 강 건너 여의도: 제목 오른쪽 빈 수평선에만, 저대비
  const towers = [[720, 60, 40], [770, 110, 34], [812, 74, 46], [866, 150, 30], [902, 92, 52], [960, 128, 36], [1004, 70, 44], [1046, 104, 40]];

  return {
    width: W, height: H, background: C.night,
    post: { grain: 0.05 },
    critic: { safeMargin: 0 },
    children: [
      { type: 'rect', x: 0, y: HZ, w: W, h: H - HZ, fill: C.water },
      ...towers.map(([x, h, w]) => ({ type: 'rect', x, y: HZ - h, w, h, fill: C.far })),
      ...ripples,
      ...strips,
      ...moonRefl,
      // 달: 상현(오른쪽 반이 밝음)
      { type: 'group', clip: { type: 'rect', x: MX, y: MY - MR, w: MR, h: MR * 2 }, children: [{ type: 'circle', cx: MX, cy: MY, r: MR, fill: C.amber }] },
      { type: 'circle', cx: MX, cy: MY, r: MR, fill: 'none', stroke: { color: C.amber, width: 1.5 }, opacity: 0.35 },
      // 제목
      { type: 'text', x: AX + 2, y: HZ - S * 1.38, text: '제3회', size: 30, weight: 700, font: 'Pretendard', fill: C.amber, letterSpacing: 1 },
      { type: 'text', x: AX - 14, y: HZ - S * 1.02, text: '한강 야간', ...TITLE, fill: C.ink },
      t2(),
      // 정보: 공유 왼쪽 축
      { type: 'stack', x: AX, y: H - 76, w: W - AX * 2, anchor: 'bottom', gap: 12, children: [
        { type: 'text', text: '2026.9.19(토)  19:00–23:00', size: 40, weight: 700, font: 'Pretendard', fill: C.ink, numeric: 'tabular' },
        { type: 'text', text: '여의도 한강공원 물빛광장', size: 30, weight: 500, font: 'Pretendard', fill: C.dim, gapBefore: 6 },
        { type: 'text', text: '무료 · 담요 지참', size: 30, weight: 600, font: 'Pretendard', fill: C.amber },
      ] },
    ],
  };
}
