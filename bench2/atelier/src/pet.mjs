// 펫 v3 "혈박쥐 루비" — 평가 지적(몸·머리가 같은 빨간 덩어리라 얼굴이 안 읽힘, 명암 부족)과 사용자 지적(단조로운 색) 반영
// 구조: 머리 분리(큰 귀 + 안쪽 분홍 살, 흰 반사광 발광 눈, 코, 송곳니) / 털결 몸통 + 밝은 배 / 두 마디 막 날개(몸 쪽 어둡고 끝으로 밝아짐 + 혈관 + 뼈 손가락)
// 군주의 펫: 금 목걸이 + 루비. ModelEngine: 큐브 회전 없음
import { PixelCanvas } from '../../../atelier/pixel.js';
import { paintFace, boneP, trim, RAMP } from './shade.mjs';

// v3.1: 몸 전체가 같은 밝기라 얼굴이 묻힘 → 털 기본을 한 단계 어둡게(base), 머리는 base+0.5
const fur = (seed, base = 2.4) => (x, y, w, h) => base + ((x + Math.floor(y / 2) + seed) % 3 === 0 ? 0.8 : (x * 5 + y * 3 + seed) % 7 === 0 ? -0.9 : 0);
const P = (ramp, pat, opt) => ({ paint: (w, h, f) => paintFace(ramp, w, h, f, pat, opt) });
const B = RAMP.blood, F = RAMP.flesh, BO = RAMP.bone, G = RAMP.glow;

const HEAD = { paint: (w, h, f) => {
  // v3.2: 털 줄무늬가 눈과 경쟁 → 얼굴 면은 매끈하게(면 명암만), 눈 2×2 발광 + 눈가 어둡게. 코·송곳니는 돌출 주둥이 큐브로
  const c = paintFace('blood', w, h, f, f === 'north' ? () => 3.2 : fur(1, 3));
  if (f !== 'north') return c;
  c.chars(0, 1, [
    'dWEdEWd',
    'deedeed',
    '.d...d.',
  ], { d: B[1], E: G[3], W: G[5], e: G[2] });
  return c;
} };
const MUZZLE = { paint: (w, h, f) => {
  const c = paintFace('flesh', w, h, f, () => 4.4, { rim: true, ao: false });
  if (f === 'north') { c.set(1, 0, F[1]); c.set(0, h - 1, BO[6]); c.set(w - 1, h - 1, BO[6]); c.set(1, h - 1, B[0]); }
  return c;
} };
// v3.1: 토끼 귀처럼 길었음 → 4칸, 위 끝을 투명으로 깎아 뾰족하게, 정면은 안쪽 분홍 살
const EAR = { paint: (w, h, f) => {
  const c = paintFace('blood', w, h, f, fur(2, 2.8));
  if (f === 'north') for (let y = 1; y < h; y++) c.set(1, y, y < 2 ? F[5] : F[4]);
  if (f !== 'up' && f !== 'down') { c.set(0, 0, null); c.set(w - 1, 0, null); c.set(f === 'east' || f === 'west' ? 0 : 0, 1, null); }
  return c;
} };
const BODY = { paint: (w, h, f) => {
  const c = paintFace('blood', w, h, f, fur(3));
  if (f === 'north') for (let y = 2; y < h; y++) for (let x = 1; x < w - 1; x++) c.set(x, y, (x + y) % 3 ? F[4] : F[5]);   // 밝은 배
  return c;
} };
/** 막 날개: tip이면 끝으로 갈수록 좁아짐. 몸 쪽 어둡고 바깥으로 밝아지는 막 + 밝은 혈관 + 위 가장자리 뼈 손가락 + 아래 톱니 */
const MEMBRANE = (tip, side) => ({ paint: (w, h, face) => {
  const c = new PixelCanvas(w, h);
  if (face !== 'north' && face !== 'south') return c.fill(B[1]);
  for (let x = 0; x < w; x++) {
    const xx = (face === 'south') !== (side === 'l') ? w - 1 - x : x;  // 몸 쪽 = xx 0
    const t = xx / Math.max(1, w - 1);
    const bottom = tip ? Math.round((h - 1) * (1 - t * 0.8)) : h - 1 - (xx % 4 === 3 ? 1 : 0);
    for (let y = 0; y <= bottom; y++) {
      // v3.1: 가장 어두운 단계가 구멍처럼 보여 '빈 틀'로 읽힘 → 막은 밝은 단계로 채우고 가장자리만 한 단계 어둡게
      let col = t < 0.33 ? B[2] : t < 0.66 ? B[3] : B[4];
      if (y === bottom) col = B[2];
      if (xx % 4 === 1 && y > 0) col = B[5];                               // 혈관(밝음) v3.2: 4칸 간격
      if (y === 0) col = BO[xx % 2 ? 3 : 4];                               // 뼈 손가락
      c.set(x, y, col);
    }
  }
  return c;
} });

export default function () {
  return {
    name: 'crimson_bat', type: 'entity', colorBudget: 32,
    bones: [
      { name: 'root', pivot: [0, 0, 0] },
      { name: 'body', pivot: [0, 9, 0], parent: 'root' },
      { name: 'head', pivot: [0, 12, -1], parent: 'body' },
      { name: 'wing_r', pivot: [3, 11, 0], parent: 'body' },
      { name: 'wing_r_tip', pivot: [9, 11, 0], parent: 'wing_r' },
      { name: 'wing_l', pivot: [-3, 11, 0], parent: 'body' },
      { name: 'wing_l_tip', pivot: [-9, 11, 0], parent: 'wing_l' },
      { name: 'feet', pivot: [0, 6, 1], parent: 'body' },
    ],
    cubes: [
      { name: 'torso', bone: 'body', from: [-3, 6, -2], to: [3, 12, 3], material: BODY },
      { name: 'collar', bone: 'body', from: [-3, 11, -2], to: [3, 12, 3], material: P('gold', trim(), { rim: false, ao: false }), inflate: 0.25 },
      { name: 'ruby', bone: 'body', from: [-1, 10, -3], to: [1, 12, -2], material: { paint: (w, h) => new PixelCanvas(w, h).fill(G[2]).set(0, 0, G[5]) }, light: 15 },
      { name: 'skull', bone: 'head', from: [-3.5, 12, -4], to: [3.5, 18, 2], material: HEAD },
      { name: 'muzzle', bone: 'head', from: [-1.5, 12.5, -5], to: [1.5, 14.5, -4], material: MUZZLE },
      { name: 'ear_r', bone: 'head', from: [1, 18, -2], to: [4, 22, -1], material: EAR },
      { name: 'ear_l', bone: 'head', from: [-4, 18, -2], to: [-1, 22, -1], material: EAR },
      { name: 'wing_r', bone: 'wing_r', from: [3, 6, 0], to: [9, 12, 1], material: MEMBRANE(false, 'r') },
      { name: 'wing_r_tip', bone: 'wing_r_tip', from: [9, 4, 0], to: [16, 12, 1], material: MEMBRANE(true, 'r') },
      { name: 'wclaw_r', bone: 'wing_r', from: [8, 12, 0], to: [10, 14, 1], material: P('bone', boneP({ seed: 3 })) },
      { name: 'wing_l', bone: 'wing_l', from: [-9, 6, 0], to: [-3, 12, 1], material: MEMBRANE(false, 'l') },
      { name: 'wing_l_tip', bone: 'wing_l_tip', from: [-16, 4, 0], to: [-9, 12, 1], material: MEMBRANE(true, 'l') },
      { name: 'wclaw_l', bone: 'wing_l', from: [-10, 12, 0], to: [-8, 14, 1], material: P('bone', boneP({ seed: 4 })) },
      { name: 'claw_r', bone: 'feet', from: [1, 4, 0], to: [2, 6, 1], material: P('bone', boneP({ seed: 5 })) },
      { name: 'claw_l', bone: 'feet', from: [-2, 4, 0], to: [-1, 6, 1], material: P('bone', boneP({ seed: 6 })) },
      { name: 'tail', bone: 'body', from: [-1, 6, 3], to: [1, 8, 5], material: P('blood', fur(4)) },
    ],
    animations: {
      idle: { length: 1.2, loop: true, bones: {
        body: { position: { 0: [0, 0, 0], 0.6: [0, 1.2, 0], 1.2: [0, 0, 0] } },
        head: { rotation: { 0: [0, 0, 0], 0.6: [-6, 8, 0], 1.2: [0, 0, 0] } },
        wing_r: { rotation: { 0: [0, 0, 18], 0.6: [0, 0, -24], 1.2: [0, 0, 18] } },
        wing_l: { rotation: { 0: [0, 0, -18], 0.6: [0, 0, 24], 1.2: [0, 0, -18] } },
        wing_r_tip: { rotation: { 0: [0, 0, 10], 0.6: [0, 0, -20], 1.2: [0, 0, 10] } },
        wing_l_tip: { rotation: { 0: [0, 0, -10], 0.6: [0, 0, 20], 1.2: [0, 0, -10] } },
      } },
      walk: { length: 0.5, loop: true, bones: {
        body: { rotation: { 0: [14, 0, 0], 0.5: [14, 0, 0] }, position: { 0: [0, 0, 0], 0.25: [0, 1.5, 0], 0.5: [0, 0, 0] } },
        head: { rotation: { 0: [-10, 0, 0], 0.5: [-10, 0, 0] } },
        wing_r: { rotation: { 0: [0, 0, 38], 0.25: [0, 0, -42], 0.5: [0, 0, 38] } },
        wing_l: { rotation: { 0: [0, 0, -38], 0.25: [0, 0, 42], 0.5: [0, 0, -38] } },
        wing_r_tip: { rotation: { 0: [0, 0, 22], 0.25: [0, 0, -30], 0.5: [0, 0, 22] } },
        wing_l_tip: { rotation: { 0: [0, 0, -22], 0.25: [0, 0, 30], 0.5: [0, 0, -22] } },
        feet: { rotation: { 0: [25, 0, 0], 0.5: [25, 0, 0] } },
      } },
    },
  };
}
