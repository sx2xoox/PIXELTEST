// v3 재질 시스템: "단계 번호(index)로 칠하고, 빛·형태에 따라 단계를 올리고 내린 뒤 램프 색으로 바꾼다"
// → 팔레트는 절제(재질당 7단)하면서도 면마다 명암·가장자리 하이라이트·AO가 생긴다.
// 램프는 색상 이동: 그림자는 보라/남색 쪽, 밝은 쪽은 주황/노랑 쪽(픽셀아트의 기본기)
import { PixelCanvas, tileNoise } from '../../../atelier/pixel.js';
import { rng } from '../../../atelier/geom.js';

export const RAMP = {
  blood: ['#1a0612', '#3a0a1c', '#650f22', '#94182a', '#c42a2e', '#ec5a3c', '#ffb08a'],   // 검보라 → 진홍 → 주황빛 하이라이트
  flesh: ['#1f0a14', '#401222', '#6a1d2c', '#93303a', '#b9504a', '#d9785e', '#f2a98a'],   // 살·근육(조금 더 따뜻하고 탁하게)
  iron: ['#0e0c14', '#1c1924', '#2c2836', '#3f3a4c', '#5a5468', '#7d7890', '#aeb0c4'],     // 흑철: 그림자 남색, 반사 푸른 회색
  bone: ['#3b2a22', '#5e4836', '#86704f', '#ab966f', '#cbb98f', '#e3d6af', '#f6efd6'],     // 뼈: 그림자 갈색, 밝은 쪽 노란 크림
  gold: ['#2a1608', '#5a3410', '#8a5a18', '#b8862a', '#dcb04a', '#f2d77a', '#fff4c0'],     // 금장식(군주의 위계)
  bruise: ['#120a1a', '#24122e', '#3a1b44', '#55285a', '#74396c', '#965078'],               // 멍든 보라(살점 보조색)
  glow: ['#5a0610', '#b0101e', '#ff2a36', '#ff7a5a', '#ffd2b8', '#ffffff'],                 // 발광(심장·눈·보석)
};

/**
 * 면 칠하기: pattern(x, y, w, h) → 기본 단계(0~6, 실수 허용) | null(투명)
 * light: 위 가장자리 +2, 위 1/3 +1, 아래 1/3 -1, 아래 가장자리 -1(AO). up 면 +1, down 면 -2. side = east/west는 -0.5(바닐라 음영과 함께 작동)
 */
export function paintFace(ramp, w, h, face, pattern, { rim = true, ao = true, grad = 1 } = {}) {
  const R = RAMP[ramp] ?? ramp;
  const c = new PixelCanvas(w, h);
  const side = face !== 'up' && face !== 'down';
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = pattern(x, y, w, h);
      if (v === null || v === undefined) continue;
      if (side) {
        const t = h > 1 ? y / (h - 1) : 0.5;
        v += grad * (t < 0.34 ? 0.7 : t > 0.66 ? -0.7 : 0);
        if (rim && y === 0 && h > 2) v += 1.6;
        if (ao && y === h - 1 && h > 2) v -= 1.2;
        if (rim && (x === 0 || x === w - 1) && w > 3) v += x === 0 ? 0.6 : -0.6;  // 왼쪽 모서리 밝게, 오른쪽 어둡게
      } else if (face === 'up') { v += 0.8; if (rim && (y === 0 || x === 0)) v += 0.8; }
      else v -= 2;
      c.set(x, y, R[Math.max(0, Math.min(R.length - 1, Math.round(v)))]);
    }
  return c;
}

// ---------- 패턴(기본 단계 함수) ----------
const N = (w, h, seed, cell = 4) => { const n = tileNoise(w, h, { cell, seed, octaves: 2 }); return (x, y) => n[y * w + x]; };

/** 흑철 판금: 판 이음새(가로 홈), 리벳(밝음+어둠 쌍), 긁힘(밝은 사선), 미세 얼룩 */
export const plate = ({ seed = 1, seam = 5, rivets = true } = {}) => {
  return (x, y, w, h) => {
    const n = N(w, h, seed)(x, y);
    let v = 3 + (n - 0.5) * 0.9;
    if (seam && y % seam === seam - 1) v -= 1.6;                     // 이음새 그림자
    if (seam && y % seam === 0 && y > 0) v += 0.9;                   // 이음새 아래 판 모서리 반사
    if (rivets && w >= 5 && (y % seam === 1) && (x === 1 || x === w - 2)) v += 2.2;
    if (rivets && w >= 5 && (y % seam === 2) && (x === 1 || x === w - 2)) v -= 1.4;
    if ((x * 3 + y * 5 + seed) % 23 === 0) v += 1.4;                 // 긁힘
    return v;
  };
};

/** 근육·살: 세로 근섬유(±단계 줄), 멍(bruise는 별도), 핏줄(어두운 가지), 젖은 반사점(밝은 1px) */
export const muscle = ({ seed = 2, fiber = 2 } = {}) => {
  const R = rng(seed);
  const veins = Array.from({ length: 3 }, () => ({ x0: R(), drift: (R() - 0.5) * 0.8 }));
  return (x, y, w, h) => {
    const n = N(w, h, seed, 5)(x, y);
    // v3.1: 점 노이즈가 거칠어 보임 → 노이즈 진폭을 줄이고 근섬유(세로 줄)가 먼저 읽히게
    let v = 3 + (n - 0.5) * 0.6 + (Math.floor((x + Math.sin(y * 0.5 + seed) * 1.0) / fiber) % 2 ? 0.55 : -0.45);
    for (const vn of veins) { const vx = (vn.x0 + vn.drift * (y / h)) * w; if (Math.abs(x - vx) < 0.6) v -= 1.7; }
    if ((x * 7 + y * 11 + seed) % 37 === 0 && n > 0.5) v = 6;      // 젖은 반사
    return v;
  };
};

/** 뼈: 매끈한 면 + 관절 고리(가로 어두운 줄 + 위 밝은 줄) + 잔금 */
export const boneP = ({ seed = 3, ring = 0, base = 3 } = {}) => (x, y, w, h) => {
  const n = N(w, h, seed)(x, y);
  let v = base + (n - 0.5) * 1.0;   // v3.1: 3.6 → 3 (밝은 베이지가 넓은 면적을 덮어 시선 분산)
  if (ring && y % ring === ring - 1) v -= 1.8;
  if (ring && y % ring === 0 && y > 0) v += 0.8;
  if ((x * 5 + y * 3 + seed) % 29 === 0) v -= 1.6;                    // 잔금
  return v;
};

/** 금장식 띠: 가운데 밝은 선, 양끝 어둡게 */
export const trim = () => (x, y, w, h) => (h <= 1 ? 4 : y === 0 ? 5 : y === h - 1 ? 2 : 3.6);

/** 천(망토): 세로 주름(밝음/어둠 교대), 아래 끝 해짐(투명) */
export const cloth = ({ seed = 4, fold = 3, tatter = true } = {}) => {
  const R = rng(seed);
  const cut = Array.from({ length: 64 }, () => Math.floor(R() * 3));
  return (x, y, w, h) => {
    if (tatter && y >= h - cut[x % 64]) return null;
    const f = Math.sin(((x + 0.5) / fold) * Math.PI);
    return 2.6 + f * 1.1;
  };
};
