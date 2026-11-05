// 한글 타이포그래피 실측 도우미 (docs/research/korean-typography.md)
// 값은 Chromium 캔버스 measureText로 잰 100px 기준 실측(글리프 잉크 높이). 라틴 전용 폰트의 hanH는 대체 글꼴 값이라 쓰지 않는다.
export const METRICS = {
  Pretendard: { hanH: 86, capH: 71, xH: 54, digit: 71, hanAdv: 86.4 },
  NanumMyeongjo: { hanH: 92, capH: 74, xH: 47, digit: 76, hanAdv: 95 },
  'Gowun Batang': { hanH: 93, capH: 70, xH: 46, digit: 70, hanAdv: 91.9 },
  'Song Myung': { hanH: 82, capH: 64, xH: 46, digit: 63, hanAdv: 88 },
  'Black Han Sans': { hanH: 78, capH: 75, xH: 60, digit: 63, hanAdv: 83.2 },
  'Do Hyeon': { hanH: 80, capH: 69, xH: 51, digit: 69, hanAdv: 76.8 },
  'Gowun Dodum': { hanH: 90, capH: 70, xH: 46, digit: 70, hanAdv: 91.9 },
  Gaegu: { hanH: 81, capH: 60, xH: 40, digit: 50, hanAdv: 82 },
  Inter: { capH: 73, xH: 55, digit: 73 },
  'Playfair Display': { capH: 71, xH: 52, digit: 53, oldstyle: true },
  'DM Serif Display': { capH: 66, xH: 49, digit: 65 },
  'Cormorant Garamond': { capH: 63, xH: 39, digit: 39, oldstyle: true },
  Fraunces: { capH: 70, xH: 48, digit: 72 },
  'Space Grotesk': { capH: 70, xH: 49, digit: 70 },
  'Archivo Black': { capH: 69, xH: 53, digit: 69 },
  'Bebas Neue': { capH: 70, xH: 70, digit: 70, caps: true },
};

/** 잘 설계된 한·영 합본 폰트(Pretendard: 71/86)의 비율 = 라틴 대문자 높이가 한글 높이의 약 0.83 */
export const MIX_TARGET = 0.83;

/**
 * 한글 문장 속 라틴(또는 숫자)을 다른 폰트로 섞을 때의 크기 배율.
 * 예) mixScale('NanumMyeongjo', 'Cormorant Garamond') → 1.21 → 라틴을 21% 키워야 같은 크기로 보인다.
 * by: 'cap'(대문자·로고) | 'x'(소문자 본문) | 'digit'(날짜·숫자)
 */
export function mixScale(korFont, latFont, by = 'cap') {
  const K = METRICS[korFont], L = METRICS[latFont];
  if (!K?.hanH || !L) return 1;
  // 구식 숫자(oldstyle) 폰트는 숫자를 키우지 말고 text의 numeric:'lining'으로 대문자 높이 숫자를 쓴다 → 대문자 높이로 계산
  const key = by === 'x' ? 'xH' : by === 'digit' && !L.oldstyle ? 'digit' : by === 'digit' ? 'capH' : 'capH';
  const ref = by === 'x' ? MIX_TARGET * 0.76 : MIX_TARGET;           // 소문자는 대문자의 약 0.76
  return +((ref * K.hanH) / L[key]).toFixed(3);
}

/** 역할별 조판 기본값(한글). size는 px. 행간은 배수, 자간은 em 비율 */
export function setting(role, size) {
  if (role === 'display') return { lineHeight: size >= 96 ? 1.08 : 1.15, letterSpacing: -0.035 * size };   // 큰 제목: 빽빽하게
  if (role === 'title') return { lineHeight: 1.25, letterSpacing: -0.02 * size };
  if (role === 'label') return { lineHeight: 1.3, letterSpacing: 0.04 * size };                              // 작은 라벨·영문 대문자: 넓게
  if (role === 'caption') return { lineHeight: 1.5, letterSpacing: -0.005 * size };
  return { lineHeight: 1.7, letterSpacing: -0.01 * size };                                                   // 본문: 한글은 네모 글자라 행간 1.6~1.8
}

/** 크기 단계: 기준 × 비율^n (한글은 단계 간 차이가 작으면 위계가 안 읽힌다 → 제목:본문 ≥ 2.5) */
export const scale = (base, ratio = 1.333) => n => +(base * ratio ** n).toFixed(1);
