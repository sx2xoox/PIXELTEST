// 피의 낫 v4 — 사용자 레퍼런스(고해상도 복셀 검 3종)에서 배운 문법으로 다시 그린 고해상도 스프라이트
//  1) 색: 한 색 계열 안에서 거의 검정 → 진홍 → 분홍 → 흰색까지 '전 명도'를 다 쓴다(이전 판은 중간 명도 3~4단에 갇혀 단조로웠음)
//  2) 날: 톱니(앞으로 기운 비대칭 이빨) + 날 경사면 경계를 따라가는 1px 흰 하이라이트 선 + 홈(fuller)의 어두운 선/밝은 턱
//  3) 대비: 붉은 날을 '거의 검정 금속'의 가시 돋친 코등이·가시 등날로 감싸 실루엣과 명도 대비를 만든다
//  4) 길이 방향 그라데이션: 뿌리는 어둡고 끝으로 갈수록 밝아진다(빛을 받는 끝)
// 좌표: 64×124 스프라이트, 왼쪽 = 날이 뻗는 쪽(모델 -Z), 위 = 모델 +Y. 레이어별 캔버스를 따로 만들어 깊이를 다르게 돌출한다.
import { PixelCanvas } from '../../../atelier/pixel.js';

export const W = 64, H = 124;
export const C = {
  K0: '#050204', K1: '#140709',                                   // 외곽선
  G1: '#1f1a1c', G2: '#352f31', G3: '#474244', G4: '#6b6467', G5: '#a39ca0', // 흑철
  R0: '#3b0a10', R1: '#5e1219', R2: '#872227', R3: '#9a2629', R4: '#b52b2f', R5: '#c62c30', R6: '#d04d51',
  P1: '#df787b', P2: '#e3a1a5', P3: '#efcece', WH: '#f8f3eb',
};
const R = [C.R0, C.R1, C.R2, C.R3, C.R4, C.R5, C.R6, C.P1, C.P2, C.P3, C.WH];
const clampI = (v, a, b) => Math.max(a, Math.min(b, Math.round(v)));
const bayer2 = (x, y) => [0, 0.5, 0.75, 0.25][(y & 1) * 2 + (x & 1)];

/** 바깥쪽에 1px 외곽선(4방향) */
function outline(c, col = C.K1) {
  const add = [];
  c.each((x, y) => { if (c.alpha(x, y)) return; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => c.alpha(x + dx, y + dy))) add.push([x, y]); });
  for (const [x, y] of add) c.set(x, y, col);
  return c;
}

// ── 날 기하: 바깥 원(등) − 안쪽 원(날) = 초승달
const O = { x: 42, y: 54, r: 40 };      // 등
const I = { x: 44, y: 70, r: 38 };      // 날(안쪽)
const ROOT_X = 46;                       // 이보다 오른쪽은 자루/코등이
const ang = (x, y) => Math.atan2(y - O.y, x - O.x); // 위(-π/2) → 왼쪽(±π)
/** 톱니: 날 안쪽 반지름을 각도에 따라 바꿈. 이빨은 끝(왼쪽 아래) 쪽으로 기울어진 비대칭 톱니 */
function tooth(x, y) {
  const a = Math.atan2(y - I.y, x - I.x);        // 뿌리 쪽 ≈ -1.45, 끝 쪽 ≈ -3.0
  const s = (-a - 1.5) * I.r;                    // 뿌리부터 날을 따라 잰 거리(px)
  if (s < 3 || s > 40) return 0;                 // 뿌리 근처·끝 1/3은 매끈한 날
  const ph = (s % 7) / 7;                        // 7px 주기
  const fade = Math.min(1, (40 - s) / 10);
  return (ph < 0.72 ? ph / 0.72 : (1 - ph) / 0.28) * 2.6 * fade; // 완만히 올라가고 급히 떨어짐
}

export function bladeLayer({ spineOnly = false } = {}) {
  const c = new PixelCanvas(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < ROOT_X; x++) {
    const px = x + 0.5, py = y + 0.5;
    const dO = O.r - Math.hypot(px - O.x, py - O.y);          // 등에서 안쪽으로
    const dIs = Math.hypot(px - I.x, py - I.y) - I.r;          // 날에서 바깥쪽으로(매끈)
    const dI = dIs - tooth(px, py);                            // 톱니 포함
    if (dO < 0 || dI < 0) continue;
    if (py > O.y + 20) continue;                               // 아래로 너무 내려가지 않게
    const wdt = dO + dIs, t = dO / Math.max(wdt, 0.001);       // t: 0 = 등, 1 = 날
    if (spineOnly && t > 0.42) continue;
    // 길이 방향 위치: 뿌리 0 → 끝 1
    const along = Math.min(1, Math.max(0, (-ang(px, py) - 1.55) / 1.75));
    let k;                                                     // R 램프 인덱스
    // 폭이 좁아지는 끝에서도 선이 끊기지 않도록 '날에서의 거리'로 경사면·하이라이트를 정한다(비율 t만 쓰면 계단처럼 끊김)
    const bev = Math.min(3.2, wdt * 0.28);                     // 날 경사면 폭
    const ful = wdt * 0.36;                                    // 홈 위치(등에서)
    if (dO < 1.1) k = 2 + along * 1.4;                         // 등 테두리
    else if (dIs < 1.15) k = 9;                                // 날 끝 1px: 가장 밝은 분홍
    else if (dIs < bev) k = 7 + along * 0.9;                   // 날 경사면
    else if (dIs < bev + 1) k = 10;                            // 흰 하이라이트 선
    else if (Math.abs(dO - ful) < 0.55 && wdt > 7) k = 0.4;    // 홈(fuller) 어두운 선
    else if (dO > ful && dO < ful + 1.1 && wdt > 7) k = 5.7;   // 홈 아래 밝은 턱
    else if (dO < ful) k = 1.2 + along * 1.7 + (dO < 2.2 ? 0.7 : 0); // 어두운 등판
    else k = 3.5 + along * 1.8 + bayer2(x, y) * 0.9;           // 몸통
    if (dI < 1.15 && tooth(px, py) > 1.6) k = 8;               // 톱니 이빨 끝은 한 단 낮게(이빨 모양이 읽히게)
    c.set(x, y, R[clampI(k, 0, 10)]);
  }
  // 날 끝(가장 왼쪽 아래)의 반짝임: 흰 점 + 십자 잔광은 이펙트가 담당, 여기선 1px만
  return outline(c);
}

/** 등날 가시: 바깥 원 위에 바깥쪽으로 솟은 검은 삼각 가시 4개(뿌리 쪽이 크고 끝으로 갈수록 작게) */
export function spikeLayer() {
  const c = new PixelCanvas(W, H);
  const list = [[-1.72, 9, 3.4], [-2.12, 7, 3], [-2.5, 5, 2.4]]; // [각도, 길이, 반폭]
  for (const [a0, len, hw] of list) {
    const bx = O.x + Math.cos(a0) * (O.r - 2), by = O.y + Math.sin(a0) * (O.r - 2);
    const nx = Math.cos(a0), ny = Math.sin(a0);       // 바깥 법선
    const tx = -ny, ty = nx;                           // 접선(끝 쪽)
    // 가시는 뿌리(오른쪽 위) 방향으로 젖혀진다: 끝점 = 법선*len − 접선*len*0.55
    const ex = bx + nx * len - tx * len * 0.55, ey = by + ny * len - ty * len * 0.55;
    const p1 = [bx + tx * hw, by + ty * hw], p2 = [bx - tx * hw, by - ty * hw];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const px = x + 0.5, py = y + 0.5;
      // 삼각형 내부 판정
      const s = (ax, ay, bx2, by2) => (bx2 - ax) * (py - ay) - (by2 - ay) * (px - ax);
      const d1 = s(p1[0], p1[1], p2[0], p2[1]), d2 = s(p2[0], p2[1], ex, ey), d3 = s(ex, ey, p1[0], p1[1]);
      if (!((d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0))) continue;
      // 명암: 왼쪽 위 빛 → 가시의 한쪽 면은 G3, 반대쪽 G1, 중심선 G4
      const side = (px - bx) * tx + (py - by) * ty;
      const along = ((px - bx) * nx + (py - by) * ny) / len;
      c.set(x, y, side > 0.6 ? C.G1 : side < -0.6 ? C.G3 : along > 0.55 ? C.G5 : C.G4);
    }
  }
  return outline(c, C.K0);
}

/** 자루: 흑철 + 핏빛 홈 + 손잡이 감개(사선 붉은 가죽) + 금속 고리 + 아래 가시 폼멜 */
export function shaftLayer() {
  const c = new PixelCanvas(W, H);
  const X0 = 45, X1 = 49, TOP = 22, BOT = 112;
  const col = [C.G3, C.G4, C.G2, C.G2, C.G1];             // 왼쪽 빛
  for (let y = TOP; y <= BOT; y++) for (let x = X0; x <= X1; x++) c.set(x, y, col[x - X0]);
  for (let y = TOP + 4; y < 64; y++) if (y % 9 !== 0) c.set(47, y, (y % 9) < 3 ? C.R5 : C.R1); // 핏빛 홈(맥박처럼 밝아지는 마디)
  // 손잡이(68~100): 사선 감개
  for (let y = 68; y <= 100; y++) for (let x = X0; x <= X1; x++) {
    const ph = (y + (x - X0)) % 5;
    c.set(x, y, ph === 0 ? C.R1 : ph === 1 ? (x === X0 + 1 ? C.P1 : C.R5) : ph === 2 ? C.R4 : ph === 3 ? C.R2 : C.R1);
  }
  const ring = y => { c.hline(X0 - 1, X1 + 1, y, C.G4); c.hline(X0 - 1, X1 + 1, y + 1, C.G2); c.set(X0, y, C.G5); };
  ring(64); ring(101); ring(40);
  // 폼멜: 아래로 뾰족한 가시 + 붉은 보석 자리(보석은 gem 레이어)
  for (let y = 113; y <= 121; y++) { const hw = Math.max(0, Math.round((121 - y) * 0.45)); for (let x = 47 - hw; x <= 47 + hw; x++) c.set(x, y, x < 47 ? C.G3 : x === 47 ? C.G4 : C.G1); }
  c.hline(43, 51, 112, C.G4); c.hline(43, 51, 113, C.G2);
  return outline(c, C.K0);
}

/** 코등이(날과 자루가 만나는 곳): 위·뒤·아래로 뻗는 검은 가시 왕관 */
export function collarLayer() {
  const c = new PixelCanvas(W, H);
  const cx = 47.5, cy = 20;
  // 몸체: 둥근 마름모
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x + 0.5, py = y + 0.5, dx = px - cx, dy = py - cy;
    if (Math.abs(dx) / 6.5 + Math.abs(dy) / 8.5 > 1) continue;
    const lit = -dx * 0.6 - dy * 0.8;                            // 왼쪽 위 빛
    c.set(x, y, lit > 4 ? C.G5 : lit > 1 ? C.G4 : lit > -2 ? C.G3 : lit > -5 ? C.G2 : C.G1);
  }
  // 가시: [끝점, 밑변 반폭]
  const spikes = [[[46, 2], 2.5], [[60, 9], 2.5], [[59, 30], 2.2], [[52, 35], 2], [[36, 31], 2]];
  for (const [[ex, ey], hw] of spikes) {
    const dx = ex - cx, dy = ey - cy, L = Math.hypot(dx, dy), nx = dx / L, ny = dy / L;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const px = x + 0.5 - cx, py = y + 0.5 - cy;
      const a = px * nx + py * ny, s = px * -ny + py * nx;
      if (a < 3 || a > L) continue;
      const half = hw * (1 - (a - 3) / (L - 3));
      if (Math.abs(s) > half) continue;
      c.set(x, y, s < -0.3 ? C.G4 : s > 0.6 ? C.G1 : a > L - 2.5 ? C.G5 : C.G3);
    }
  }
  return outline(c, C.K0);
}

/** 혈석: 코등이 중앙(큰 것)과 폼멜(작은 것). 진홍 → 밝은 중심 + 흰 반사점 */
export function gemLayer() {
  const c = new PixelCanvas(W, H);
  const gem = (cx, cy, r) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy) / r;
      if (d > 1) continue;
      const lit = (-dx - dy) / r;
      c.set(x, y, d > 0.8 ? C.R1 : lit > 0.55 ? C.P2 : lit > 0.1 ? C.R6 : lit > -0.4 ? C.R5 : C.R3);
    }
    c.set(Math.floor(cx - r * 0.4), Math.floor(cy - r * 0.45), C.WH);
  };
  gem(47.5, 20, 3.6); gem(47.5, 116, 1.9);
  return outline(c, C.K0);
}

/** 미리보기용 합성(평면) */
export function flat() {
  const c = new PixelCanvas(W, H);
  for (const l of [shaftLayer(), bladeLayer(), spikeLayer(), collarLayer(), gemLayer()]) c.paste(l);
  return c;
}
