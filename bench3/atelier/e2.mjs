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
// r2: (본 것) "제3회"가 "한강"에 겹침, 받침 잉크가 수평선 아래로 내려가 반영과 엉킴, 반영이 갈색 벽돌 줄무늬, 스카이라인이 막대그래프,
//     달 테두리가 아이콘 같음 → 라벨을 제목 잉크 위로, 잉크 바닥=수평선, 불규칙 띠, 낮은 한 덩어리 실루엣, 테두리 제거.
// r3: screen을 써도 호박색→남색 페이드는 여전히 갈색(진흙색) → 제목 반영은 크림(달빛)으로: 남색으로 사라질 때 회청색이 된다.
//     호박색은 달과 달 반영에만(강조 한 곳). 수평선 근처 띠는 틈을 거의 없애 글자가 매끈하게 읽히고, 아래로 갈수록 틈이 생긴다.
// r4: (analyze) 초점 (0.62,0.49) 3분할거리 0.164 > 0.15, 노탄 6 > 5 → 수평선 800→744로 올려 초점을 위 3분할선 쪽으로,
//     스카이라인은 "회"에서 떼고(770~) 더 낮게 해서 별도 덩어리로 안 읽히게.
// r5: (본 것) 수평선을 올리자 달이 "간"과 부딪힘 → 달을 "독서회" 오른쪽 빈 곳, 스카이라인 위로 내려 반영 기둥과 수직으로 잇는다
//     (위쪽 하늘은 통째로 빈 공간). 수평선 근처 기둥의 사다리 계단 → 흔들림 진폭을 k²로 키워 위는 매끈, 아래는 부서지게.
// r6: 달과 "간" 사이가 25px로 답답 → 달을 28px 내리고 r 46→44. 최종.
export default function () {
  const W = 1080, H = 1350, AX = 72, HZ = 744, S = 250;
  const C = { night: '#0a1230', water: '#0d1940', ink: '#f2e7cc', amber: '#ffb347', refl: '#e8b46a', dim: '#8f9ec8', far: '#16234f' };
  const TITLE = { size: S, weight: 800, font: 'NanumMyeongjo', letterSpacing: -0.045 * S };
  const D = 30;                                   // r2: 명조 받침 잉크가 베이스라인 아래 ~0.12S → 잉크 바닥을 수평선에 맞춘다
  const Y2 = HZ - D, Y1 = Y2 - S * 1.02;
  const t2 = (extra = {}) => ({ type: 'text', x: AX - 14, y: Y2, text: '독서회', ...TITLE, fill: C.ink, ...extra });

  // 반영: 수평선 기준 뒤집은 "독서회"를 가로 띠로 잘라 흔든다
  // r2: 탁한 반투명 호박색(갈색 벽돌처럼 보임) → screen 블렌드 + 밝은 색. 위쪽 띠는 얇고 거의 붙어 있어 글자가 읽히고,
  //     아래로 갈수록 띠가 두꺼워지고(원근) 틈·흔들림이 커지며 사라진다. 틈 폭도 불규칙(R12).
  const rnd = (i, s = 1) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
  const strips = [];
  for (let y = HZ + 2, k = 0; y < HZ + 260; k++) {
    const h = 3 + k * 0.9 + rnd(k, 2) * 3, vis = Math.min(1, 1.05 - k * 0.018 - rnd(k, 4) * Math.min(0.4, k * 0.03));
    const amp = Math.min(24, 0.8 + k * k * 0.09), dx = (rnd(k) * 2 - 1) * amp;
    strips.push({ type: 'group', clip: { type: 'rect', x: 0, y, w: W, h: h * vis }, children: [
      t2({ transform: `translate(${dx.toFixed(1)},${2 * HZ}) scale(1,-1)`, fill: C.ink, opacity: Math.max(0.05, 0.62 - k * 0.026) }),
    ] });
    y += h;
  }
  // 물결 결(전폭, 불규칙 길이 — 균등 반복 금지 R12)
  const ripples = Array.from({ length: 16 }, (_, i) => {
    const y = HZ + 20 + i * i * 2.2 + rnd(i, 3) * 10, x = rnd(i, 5) * W * 0.9 - 40, len = 80 + rnd(i, 7) * 300;
    return { type: 'brush', points: [[x, y], [x + len / 2, y - 1], [x + len, y]], width: 1.5 + rnd(i, 9) * 2.5, taper: 0.9, fill: '#22336b', opacity: 0.8 };
  });
  // 달(상현 — 2026.9.19 실제 월령) 반영: 불규칙 대시 기둥
  const MX = 900, MY = HZ - 162, MR = 44;
  const moonRefl = Array.from({ length: 10 }, (_, i) => {
    const y = HZ + 10 + i * (12 + i * 3.4), len = (64 - i * 5) * (0.55 + rnd(i, 11) * 0.7), x = MX + 14 + (rnd(i, 13) - 0.5) * 24;
    return { type: 'brush', points: [[x - len / 2, y], [x, y - 1], [x + len / 2, y]], width: Math.max(1.5, 5.5 - i * 0.45), taper: 0.9, fill: C.amber, opacity: 0.95 - i * 0.05 };
  });
  // 강 건너 여의도: 제목 오른쪽 빈 수평선에만, 저대비. r2: 막대그래프처럼 보이던 높은 사각형 → 낮고 불규칙한 실루엣 하나
  const skyline = (() => {
    const xs = [770, 792, 806, 840, 858, 884, 906, 936, 962, 984, 1010, 1030, 1056, 1080];
    const hs = [8, 20, 14, 40, 28, 70, 38, 24, 52, 32, 18, 44, 22, 12];
    let d = `M${xs[0]},${HZ}`;
    xs.forEach((x, i) => { const nx = xs[i + 1] ?? 1080; d += ` L${x},${HZ - hs[i]} L${nx},${HZ - hs[i]}`; });
    return d + ` L1080,${HZ} Z`;
  })();

  return {
    width: W, height: H, background: C.night,
    post: { grain: 0.05 },
    critic: { safeMargin: 0 },
    children: [
      { type: 'rect', x: 0, y: HZ, w: W, h: H - HZ, fill: C.water },
      { type: 'path', d: skyline, fill: C.far },
      ...ripples,
      ...strips,
      ...moonRefl,
      // 달: 상현(오른쪽 반이 밝음)
      { type: 'group', clip: { type: 'rect', x: MX, y: MY - MR, w: MR, h: MR * 2 }, children: [{ type: 'circle', cx: MX, cy: MY, r: MR, fill: C.amber }] },
      // 제목
      { type: 'text', x: AX + 2, y: Y1 - S * 0.84 - 40, text: '제3회', size: 30, weight: 700, font: 'Pretendard', fill: C.amber, letterSpacing: 1 },
      { type: 'text', x: AX - 14, y: Y1, text: '한강 야간', ...TITLE, fill: C.ink },
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
