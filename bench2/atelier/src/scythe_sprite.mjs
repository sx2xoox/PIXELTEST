// 피의 낫 v5 "혈익낫(血翼낫)" — 레퍼런스의 '원리'(docs/research/reference-principles.md)를 피의 군주 고유 콘셉트에 적용
//  콘셉트: 흡혈 귀족. 모티프 = 박쥐 날개 · 혈맥 · 왕관 · 핏방울
//  1차 실루엣: 초승달 낫. 2차 장식: 날개 손가락뼈(금속 뼈대)와 부채꼴 막, 왕관 코등이, 심장 혈석. 3차: 막 속 혈맥, 날 하이라이트 선
//  명도: 흑자색 금속 틀(어두움)이 피 결정 막(중간)을 감싸고, 초점은 심장 혈석 + 날 끝 반사선 두 곳만 가장 밝게
//  흐름: 자루의 혈맥이 나선으로 감아 올라가 심장 → 날개뼈 → 막 속 혈맥으로 이어져 날 끝까지 흐른다
// 좌표: 64×124, 왼쪽 = 날 방향(모델 -Z), 위 = +Y
import { PixelCanvas } from '../../../atelier/pixel.js';
import { BLOOD as PAL } from '../../../rpg/palettes.mjs';

export const W = 64, H = 124;
export const C = {
  // v6 색 조화: 지역 팔레트 「피의 땅」 역할 램프(갑옷 MET와 같은 금속, 재료 아이콘과 같은 진홍·발광)
  K0: PAL.ink,                                                                   // 외곽선 = 세트 잉크
  ...Object.fromEntries(PAL.ramp('metal', { steps: 5, lo: 0.17, hi: 0.72, ink: false }).map((c, i) => ['V' + (i + 1), c])),   // 자두빛 흑철 → 밝은 반사
  ...Object.fromEntries(PAL.ramp('primary', { steps: 6, lo: 0.17, hi: 0.58, ink: false }).map((c, i) => ['B' + i, c])),       // 와인 → 진홍
  ...Object.fromEntries(PAL.ramp('glow', { steps: 3, lo: 0.55, hi: 0.8, ink: false }).map((c, i) => ['G' + (i + 1), c])),     // 발광(빛나는 부분 전용)
};
// 하위 호환(아이콘 등에서 쓰던 이름)
Object.assign(C, { K1: C.K0, G4: C.V4, G5: C.V5, R1: C.B1, R2: C.B2, R3: C.B3, R5: C.B5, R6: C.G1, P1: C.G2, P2: C.G3, WH: C.G3 });

const rng = s => () => ((s = (s + 0x6d2b79f5) | 0), (((s ^ (s >>> 15)) * (1 | s)) >>> 0) / 4294967296);
function outline(c, col = C.K0) {
  const add = [];
  c.each((x, y) => { if (!c.alpha(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => c.alpha(x + dx, y + dy))) add.push([x, y]); });
  for (const [x, y] of add) c.set(x, y, col);
  return c;
}

// ── 날 기하
const O = { x: 42, y: 54, r: 40 }, I = { x: 44, y: 70, r: 38 };
const ROOT = [42, 32];                               // 날개뼈가 뻗어 나가는 점(왕관 중심)
const RIBS = [-1.7, -2.12, -2.55, -2.95];           // 날개뼈 끝이 닿는 바깥 원 위의 각도(뿌리 → 끝)
const angO = (x, y) => Math.atan2(y - O.y, x - O.x);
/** 등 가장자리: 날개뼈 사이가 오목하게 파인 박쥐 날개 막 */
function scallop(a) {
  for (let i = 0; i < RIBS.length - 1; i++) {
    const a0 = RIBS[i], a1 = RIBS[i + 1];
    if (a <= a0 && a >= a1) { const f = (a0 - a) / (a0 - a1); return 6.5 * Math.sin(Math.PI * f) ** 0.9 * (1 - i * 0.18); }
  }
  return 0;
}

/** 피 결정 막(날 본체) */
export function bladeLayer() {
  const c = new PixelCanvas(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < 46; x++) {
    const px = x + 0.5, py = y + 0.5, a = angO(px, py);
    const dO = O.r - Math.hypot(px - O.x, py - O.y) - scallop(a);
    const dI = Math.hypot(px - I.x, py - I.y) - I.r;
    if (dO < 0 || dI < 0 || py > O.y + 20) continue;
    const along = Math.min(1, Math.max(0, (-a - 1.55) / 1.75)); // 뿌리 0 → 끝 1
    let col;
    if (dI < 1.1) col = along > 0.55 ? C.G2 : C.G1;            // 날 끝 1px: 빛나는 주홍(끝으로 갈수록 밝게 → 초점)
    else if (dI < 2.1) col = C.G3;                              // 크림 반사선(끊기지 않게 '날에서의 거리'로)
    else if (dI < 4.2) col = C.B5;                              // 날 경사면
    else if (dO < 1.2) col = C.B1;                              // 막 가장자리(어두움)
    else {                                                      // 막: 뿌리·등 쪽 어둡고 날 쪽으로 밝아지는 결정
      const t = dO / (dO + dI);
      const v = t * 2.6 + along * 0.8 + ((x + y) % 2) * 0.35;
      col = [C.B1, C.B2, C.B3, C.B4][Math.max(0, Math.min(3, Math.floor(v)))];
    }
    c.set(x, y, col);
  }
  // 막 속 혈맥: 날개뼈 사이에서 시작해 날 쪽으로 흐르는 가는 선(무작위 걷기, 끝으로 갈수록 밝게)
  const R = rng(7);
  for (let i = 0; i < RIBS.length - 1; i++) {
    const am = (RIBS[i] + RIBS[i + 1]) / 2;
    let x = ROOT[0] + (O.x + Math.cos(am) * (O.r - 8) - ROOT[0]) * 0.55, y = ROOT[1] + (O.y + Math.sin(am) * (O.r - 8) - ROOT[1]) * 0.55;
    for (let s = 0; s < 22; s++) {
      const dI = Math.hypot(x - I.x, y - I.y) - I.r; if (dI < 4.5) break;
      const ix = Math.floor(x), iy = Math.floor(y);
      if (c.alpha(ix, iy)) c.set(ix, iy, s > 12 ? C.G1 : C.B5);
      const dx = I.x - x, dy = I.y - y, L = Math.hypot(dx, dy);
      x += (dx / L) * 0.9 + (R() - 0.5) * 0.9; y += (dy / L) * 0.9 + (R() - 0.5) * 0.9;
      if (R() < 0.12) { const bx = ix + (R() < 0.5 ? -1 : 1), by = iy + 1; if (c.alpha(bx, by)) c.set(bx, by, C.B4); } // 잔가지
    }
  }
  return outline(c);
}

/** 날개 손가락뼈: 뿌리에서 바깥 원의 RIBS 각도까지 뻗는 흑자색 금속 뼈 + 가운데 관절 마디 */
export function ribLayer() {
  const c = new PixelCanvas(W, H);
  RIBS.forEach((a, i) => {
    const ex = O.x + Math.cos(a) * (O.r + 2.5), ey = O.y + Math.sin(a) * (O.r + 2.5);
    const dx = ex - ROOT[0], dy = ey - ROOT[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    const w0 = 1.7 - i * 0.2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const px = x + 0.5 - ROOT[0], py = y + 0.5 - ROOT[1];
      const t = (px * dx + py * dy) / (L * L), s = px * nx + py * ny;
      if (t < 0 || t > 1) continue;
      const half = w0 * (1 - t * 0.6) + (Math.abs(t - 0.5) < 0.05 ? 0.8 : 0);
      if (Math.abs(s) > half) continue;
      c.set(x, y, s < -half * 0.35 ? C.V4 : s > half * 0.4 ? C.V1 : t > 0.88 ? C.V5 : C.V3);
    }
  });
  return outline(c);
}
export const spikeLayer = ribLayer; // 이전 이름 호환

/** 자루: 흑자색 금속 + 날 쪽으로 감아 올라가는 혈맥 나선 + 와인 가죽 X자 감개 + 폼멜 금속 갓 */
export function shaftLayer() {
  const c = new PixelCanvas(W, H);
  const X0 = 45, X1 = 49, TOP = 26, BOT = 110;
  const col = [C.V3, C.V4, C.V2, C.V2, C.V1];
  for (let y = TOP; y <= BOT; y++) for (let x = X0; x <= X1; x++) c.set(x, y, col[x - X0]);
  for (let y = TOP; y < 66; y++) { const x = X0 + Math.round(2 + 2 * Math.sin(y * 0.55)); c.set(x, y, y < 40 ? C.G1 : y < 54 ? C.B5 : C.B4); }
  for (let y = 70; y <= 98; y++) for (let x = X0; x <= X1; x++) {
    const k = x - X0, a = (y + k) % 6, b = (y - k + 60) % 6;
    c.set(x, y, a === 0 || b === 0 ? C.B1 : k === 1 ? C.B4 : k < 3 ? C.B3 : C.B2);
  }
  const ring = y => { c.hline(X0 - 1, X1 + 1, y, C.V4); c.hline(X0 - 1, X1 + 1, y + 1, C.V2); c.set(X0, y, C.V5); };
  ring(67); ring(99);
  c.hline(44, 50, 110, C.V4); c.hline(44, 50, 111, C.V2); c.hline(45, 49, 112, C.V2);
  return outline(c);
}

/** 왕관 코등이: 자루를 감싼 띠 + 위로 솟은 세 갈래 관(가운데가 가장 높음) + 아래로 늘어진 두 송곳 */
export function collarLayer() {
  const c = new PixelCanvas(W, H);
  for (let y = 18; y <= 27; y++) for (let x = 40; x <= 54; x++) {
    const e = Math.abs(x - 47) / 7.5 + Math.abs(y - 22.5) / 9; if (e > 1) continue;
    const lit = -(x - 47) * 0.5 - (y - 22.5) * 0.7;
    c.set(x, y, lit > 3 ? C.V5 : lit > 0.5 ? C.V4 : lit > -2.5 ? C.V3 : C.V2);
  }
  for (const [ex, ey, hw, by] of [[47, 4, 2.6, 19], [40, 11, 2, 20], [54, 11, 2, 20], [43, 34, 1.6, 26], [51, 34, 1.6, 26]]) {
    for (let y = Math.min(ey, by); y <= Math.max(ey, by); y++) {
      const t = (y - by) / (ey - by), half = hw * (1 - t);
      const cx = 47 + (ex - 47) * t;
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) { const s = x + 0.5 - cx; if (Math.abs(s) > half + 0.2) continue; c.set(x, y, s < -0.4 ? C.V4 : s > 0.6 ? C.V1 : t > 0.8 ? C.V5 : C.V3); }
    }
    if (ey < by) c.set(ex, ey - 1, C.G1); // 위로 솟은 갈래 끝: 작은 핏방울 보석
  }
  return outline(c);
}

/** 혈석: 왕관 중심의 심장(가장 밝은 초점) + 폼멜 아래 거꾸로 맺힌 핏방울 */
export function gemLayer() {
  const c = new PixelCanvas(W, H);
  const heart = (cx, cy, s) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = (x + 0.5 - cx) / s, v = -(y + 0.5 - cy) / s + 0.25;
      const f = (u * u + v * v - 1) ** 3 - u * u * v * v * v;
      if (f > 0) continue;
      const lit = (-u + v) * 0.5 - 0.1, r = Math.hypot(u, v - 0.2);
      c.set(x, y, r > 0.95 ? C.B2 : lit > 0.35 ? C.G2 : lit > 0 ? C.G1 : lit > -0.4 ? C.B5 : C.B4);
    }
    c.set(Math.floor(cx - s * 0.45), Math.floor(cy - s * 0.35), C.G3);
  };
  heart(47.5, 22.5, 3.4);
  for (let y = 112; y <= 121; y++) for (let x = 43; x <= 52; x++) {
    const dx = x + 0.5 - 47.5, dy = y + 0.5 - 115.5;
    const inside = dy <= 0 ? Math.hypot(dx, dy * 1.2) <= 3.2 : Math.abs(dx) <= 3.2 * (1 - dy / 6);
    if (!inside) continue;
    const lit = -dx - dy * 0.6;
    c.set(x, y, lit > 2 ? C.G2 : lit > 0 ? C.G1 : lit > -2 ? C.B5 : C.B3);
  }
  c.set(46, 114, C.G3);
  return outline(c);
}

export function flat() {
  const c = new PixelCanvas(W, H);
  for (const l of [shaftLayer(), bladeLayer(), ribLayer(), collarLayer(), gemLayer()]) c.paste(l);
  return c;
}
