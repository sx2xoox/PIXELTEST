// 설치한 폰트 견본(렌더러에서 실제로 쓰이는지 확인용). 역할: 한글 명조 / 한글 제목 / 라틴 세리프 / 라틴 디스플레이
const F = [
  ['NanumMyeongjo', 800, '나눔명조 — 밤의 도서관, 한 줄의 문장'],
  ['Gowun Batang', 700, '고운바탕 — 부드러운 명조의 온기'],
  ['Song Myung', 400, '송명 — 붓끝의 기세, 전통과 격식'],
  ['Black Han Sans', 400, '검은고딕 — 강하고 무거운 제목'],
  ['Do Hyeon', 400, '도현 — 둥글고 친근한 고딕 제목'],
  ['Gowun Dodum', 400, '고운돋움 — 잔잔한 본문용 고딕'],
  ['Gaegu', 700, '개구 — 손으로 쓴 메모 같은 글씨'],
  ['Pretendard', 700, '프리텐다드 — 중립적인 정보 전달'],
  ['Playfair Display', 800, 'Playfair Display — The Night Library'],
  ['DM Serif Display', 400, 'DM Serif Display — Editorial Voice'],
  ['Cormorant Garamond', 600, 'Cormorant Garamond — Quiet Elegance'],
  ['Fraunces', 700, 'Fraunces — Warm, Wonky Serif'],
  ['Space Grotesk', 700, 'Space Grotesk — Geometric Tech'],
  ['Archivo Black', 400, 'ARCHIVO BLACK — POSTER WEIGHT'],
  ['Bebas Neue', 400, 'BEBAS NEUE — CONDENSED CAPITALS'],
];
export default () => ({
  width: 1200, height: 80 + F.length * 64, background: '#f4f1ea',
  children: F.flatMap(([font, weight, t], i) => [
    { type: 'text', x: 40, y: 70 + i * 64, text: t, font, weight, size: 40, fill: '#1c1a17' },
    { type: 'text', x: 1160, y: 70 + i * 64, text: font, size: 14, fill: '#8a8378', align: 'right', font: 'Inter' },
  ]),
});
