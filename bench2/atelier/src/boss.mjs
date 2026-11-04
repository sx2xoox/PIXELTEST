// 보스 v3 "혈해의 거상" — 평가 지적(머리가 너무 작음, 위장무늬 얼룩 텍스처, 약한 공격 자세)과 사용자 지적(단조로운 색·명암 없음) 반영
// 재질: shade.mjs(7단 색상이동 램프 + 면 명암 + 구조 패턴: 근섬유·핏줄·판금 이음새·관절 고리·주름)
// 시선 위계: ① 발광 심장 ② 눈구멍 ③ 금 왕관·족쇄 ④ 뼈 견갑. 높이 약 78(플레이어 2.4배). ModelEngine: 큐브 회전 없음, hitbox 본
import { PixelCanvas } from '../../../atelier/pixel.js';
import { paintFace, plate, muscle, boneP, trim, cloth, RAMP } from './shade.mjs';

const M = (ramp, pat, opt) => ({ paint: (w, h, f) => paintFace(ramp, w, h, f, pat, opt) });
const FL = s => M('flesh', muscle({ seed: s }));
const BN = (s, ring = 0) => M('bone', boneP({ seed: s, ring }));
const IR = s => M('iron', plate({ seed: s, seam: 4 }));
const GD = M('gold', trim(), { rim: false, ao: false });
const GLOW = { paint: (w, h) => { const c = new PixelCanvas(w, h); c.each((x, y) => { const d = Math.max(Math.abs(x + 0.5 - w / 2) / (w / 2), Math.abs(y + 0.5 - h / 2) / (h / 2)); c.set(x, y, RAMP.glow[d < 0.3 ? 5 : d < 0.55 ? 4 : d < 0.8 ? 3 : 2]); }); return c; } };
/** 살 + 빛나는 피의 균열(몸통) */
const FL_CRACK = s => ({ paint: (w, h, f) => {
  const c = paintFace('flesh', w, h, f, muscle({ seed: s }));
  if (f === 'north' || f === 'east' || f === 'west') for (let k = 0; k < 3; k++) { let x = Math.floor(w * (0.2 + k * 0.3)), y = 2 + k * 3; for (let i = 0; i < h * 0.5 && y < h; i++) { c.set(x, y, RAMP.glow[i % 3 === 0 ? 3 : 2]); y++; if (i % 2) x += k % 2 ? 1 : -1; } }
  return c;
} });
/** 뼈 + 빛나는 금(팔뚝) */
const BN_CRACK = s => ({ paint: (w, h, f) => {
  const c = paintFace('bone', w, h, f, boneP({ seed: s, ring: 6 }));
  if (f !== 'up' && f !== 'down') { let x = Math.floor(w / 2); for (let y = 2; y < h - 2; y++) { c.set(x, y, RAMP.glow[y % 4 === 0 ? 3 : 2]); if (y % 3 === 0) x += y % 2 ? 1 : -1; x = Math.max(1, Math.min(w - 2, x)); } }
  return c;
} });
const SKULL = { paint: (w, h, f) => {
  const c = paintFace('bone', w, h, f, boneP({ seed: 15 }));
  if (f !== 'north') return c;
  // 16×14 얼굴: 깊은 눈구멍(발광 눈), 코구멍, 광대 그림자
  const B = RAMP.bone, G = RAMP.glow;
  c.chars(0, 3, [
    '................',
    '..dddd....dddd..',
    '.dDDDDd..dDDDDd.',
    '.dDGWDd..dDWGDd.',
    '.dDDDDd..dDDDDd.',
    '..dddd.dd.dddd..',
    '..s....dd....s..',
    '..ss........ss..',
  ], { d: B[1], D: B[0], G: G[3], W: G[5], s: B[2] });
  return c;
} };
const JAW = { paint: (w, h, f) => {
  const c = paintFace('bone', w, h, f, boneP({ seed: 16 }));
  if (f === 'north') for (let x = 1; x < w - 1; x++) { c.set(x, 0, x % 2 ? RAMP.bone[6] : RAMP.bone[1]); c.set(x, 1, x % 2 ? RAMP.bone[5] : RAMP.bone[0]); }
  return c;
} };
const PAULDRON = { paint: (w, h, f) => {
  const c = paintFace('bone', w, h, f, boneP({ seed: 21, ring: 4 }));
  if (f !== 'up' && f !== 'down') { c.hline(0, w - 1, h - 1, RAMP.gold[4]); c.hline(0, w - 1, h - 2, RAMP.gold[2]); }
  return c;
} };

function mirror(c) {
  return { ...c, name: c.name.replace(/_r(\d*)$/, '_l$1'), bone: c.bone?.replace(/_r$/, '_l'), from: [-c.to[0], c.from[1], c.from[2]], to: [-c.from[0], c.to[1], c.to[2]] };
}

export default function () {
  const bones = [
    { name: 'root', pivot: [0, 0, 0] },
    { name: 'hitbox', pivot: [0, 60, 0], parent: 'root' },
    { name: 'body', pivot: [0, 32, 0], parent: 'root', rotation: [16, 0, 0] },
    { name: 'head', pivot: [0, 58, -8], parent: 'body' },
    { name: 'arm_r', pivot: [21, 56, -3], parent: 'body' },
    { name: 'forearm_r', pivot: [23, 37, -4], parent: 'arm_r' },
    { name: 'arm_l', pivot: [-21, 56, -3], parent: 'body' },
    { name: 'forearm_l', pivot: [-23, 37, -4], parent: 'arm_l' },
    { name: 'leg_r', pivot: [10, 30, 0], parent: 'root' },
    { name: 'leg_l', pivot: [-10, 30, 0], parent: 'root' },
    { name: 'cape', pivot: [0, 58, 12], parent: 'body' },
  ];
  const right = [
    // 어깨: 금 테두리 뼈 견갑 + 가시 2개
    { name: 'pauldron_r', bone: 'body', from: [15, 52, -10], to: [27, 62, 4], material: PAULDRON },
    { name: 'pspike_r', bone: 'body', from: [19, 62, -6], to: [22, 70, -3], material: BN(31) },
    { name: 'pspike_r2', bone: 'body', from: [23, 62, -2], to: [25, 67, 0], material: BN(32) },
    // 팔
    { name: 'upper_r', bone: 'arm_r', from: [17, 37, -9], to: [28, 55, 2], material: FL(3) },
    { name: 'fore_r', bone: 'forearm_r', from: [17, 13, -10], to: [29, 37, 2], material: BN_CRACK(4) },
    { name: 'shackle_r', bone: 'forearm_r', from: [16, 17, -11], to: [30, 22, 3], material: IR(5) },
    { name: 'shackle_trim_r', bone: 'forearm_r', from: [16, 22, -11], to: [30, 23, 3], material: GD },
    { name: 'chain_r1', bone: 'forearm_r', from: [26, 12, -2], to: [28, 16, 0], material: IR(6) },
    { name: 'chain_r2', bone: 'forearm_r', from: [26, 7, -2], to: [28, 11, 0], material: IR(7) },
    ...[0, 1, 2, 3].map(i => ({ name: `claw_r${i}`, bone: 'forearm_r', from: [17.5 + i * 3, 4, -11], to: [19.5 + i * 3, 13, -9], material: BN(40 + i, 3) })),
    // 다리: 근육 허벅지 + 뼈 정강이받이 + 흑철 발판금 + 발톱
    { name: 'thigh_r', bone: 'leg_r', from: [4, 16, -7], to: [17, 31, 7], material: FL(7) },
    { name: 'greave_r', bone: 'leg_r', from: [5, 3, -8], to: [16, 17, 5], material: BN(8, 5) },
    { name: 'sabaton_r', bone: 'leg_r', from: [4, 0, -12], to: [17, 4, 6], material: IR(9) },
    ...[0, 1, 2].map(i => ({ name: `toe_r${i}`, bone: 'leg_r', from: [5.5 + i * 4, 0, -15], to: [7.5 + i * 4, 3, -12], material: BN(46 + i) })),
    // 뿔
    { name: 'horn_r', bone: 'head', from: [8, 62, -17], to: [12, 66, -13], material: BN(17) },
    { name: 'horn_r2', bone: 'head', from: [11, 66, -16], to: [14, 71, -13], material: BN(18) },
    { name: 'horn_r3', bone: 'head', from: [12, 71, -15], to: [14, 76, -13], material: BN(19) },
  ];
  const ribs = [40, 44.5, 49, 53.5].flatMap((y, i) => [
    { name: `rib_r${i}`, bone: 'body', from: [3, y, -13], to: [15, y + 2, -11], material: BN(20 + i) },
  ]);
  const center = [
    { name: 'hitbox', bone: 'hitbox', from: [-22, 0, -22], to: [22, 78, 22], material: { mat: 'solid', color: '#ffffff' }, faces: Object.fromEntries(['north', 'east', 'south', 'west', 'up', 'down'].map(f => [f, { hidden: true }])) },
    { name: 'pelvis', bone: 'body', from: [-12, 28, -8], to: [12, 36, 8], material: FL(1) },
    { name: 'belt', bone: 'body', from: [-12, 34, -8], to: [12, 36, 8], material: GD, inflate: 0.5 },
    { name: 'torso', bone: 'body', from: [-17, 36, -11], to: [17, 58, 11], material: FL_CRACK(2) },
    { name: 'heart', bone: 'body', from: [-4, 42, -12], to: [4, 50, -11], material: GLOW, light: 15, faces: { south: { hidden: true } } },
    { name: 'sternum', bone: 'body', from: [-1, 38, -14], to: [1, 57, -13], material: BN(9, 4) },
    ...[0, 1, 2, 3].map(i => ({ name: `spine_${i}`, bone: 'body', from: [-1.5, 42 + i * 5, 11], to: [1.5, 45 + i * 5, 17 - i], material: BN(30 + i) })),
    { name: 'cape', bone: 'cape', from: [-15, 24, 12], to: [15, 58, 13], material: M('blood', cloth({ seed: 4, fold: 3 })) },
    { name: 'skull', bone: 'head', from: [-8, 56, -22], to: [8, 70, -8], material: SKULL },
    { name: 'jaw', bone: 'head', from: [-7, 52, -21], to: [7, 56, -10], material: JAW },
    { name: 'crown', bone: 'head', from: [-8, 70, -22], to: [8, 72, -8], material: GD },
    // v3.1: 가늘고 긴 뼈 막대가 손가락처럼 보임 → 짧고 뾰족한 금 왕관 끝(가운데가 가장 높음, 2단으로 끝을 좁힘)
    ...[[-7, 2], [-3, 3], [1, 3], [5, 2]].map(([x, hgt], i) => ({ name: `cpt_${i}`, bone: 'head', from: [x, 72, -22], to: [x + 2, 72 + hgt, -20], material: GD })),
    { name: 'cpt_c', bone: 'head', from: [-1, 74, -22], to: [1, 78, -20], material: GD },
    { name: 'cgem', bone: 'head', from: [-1, 72, -23], to: [1, 74, -22], material: GLOW, light: 15 },
  ];
  const cubes = [...center, ...right, ...right.map(mirror), ...ribs, ...ribs.map(mirror)];
  return {
    name: 'sanguine_colossus', type: 'entity', colorBudget: 48, bones, cubes,
    animations: {
      idle: { length: 2.4, loop: true, bones: {
        body: { rotation: { 0: [0, 0, 0], 1.2: [-3, 0, 0], 2.4: [0, 0, 0] }, position: { 0: [0, 0, 0], 1.2: [0, 1, 0], 2.4: [0, 0, 0] } },
        arm_r: { rotation: { 0: [0, 0, 0], 1.2: [-5, 0, 4], 2.4: [0, 0, 0] } },
        arm_l: { rotation: { 0: [0, 0, 0], 1.2: [-5, 0, -4], 2.4: [0, 0, 0] } },
        head: { rotation: { 0: [0, 0, 0], 1.2: [-8, 6, 0], 2.4: [0, 0, 0] } },
        cape: { rotation: { 0: [6, 0, 0], 1.2: [10, 0, 0], 2.4: [6, 0, 0] } },
      } },
      walk: { length: 1.6, loop: true, bones: {
        leg_r: { rotation: { 0: [22, 0, 0], 0.8: [-22, 0, 0], 1.6: [22, 0, 0] } },
        leg_l: { rotation: { 0: [-22, 0, 0], 0.8: [22, 0, 0], 1.6: [-22, 0, 0] } },
        arm_r: { rotation: { 0: [-18, 0, 0], 0.8: [18, 0, 0], 1.6: [-18, 0, 0] } },
        arm_l: { rotation: { 0: [18, 0, 0], 0.8: [-18, 0, 0], 1.6: [18, 0, 0] } },
        body: { rotation: { 0: [0, 0, 4], 0.4: [3, 0, 0], 0.8: [0, 0, -4], 1.2: [3, 0, 0], 1.6: [0, 0, 4] }, position: { 0: [0, 0, 0], 0.4: [0, -2, 0], 0.8: [0, 0, 0], 1.2: [0, -2, 0], 1.6: [0, 0, 0] } },
        cape: { rotation: { 0: [12, 0, 0], 0.4: [18, 0, 0], 0.8: [12, 0, 0], 1.2: [18, 0, 0], 1.6: [12, 0, 0] } },
      } },
      // 공격: 포효하며 젖힘(0.55s) → 웅크리며 내려찍기(0.75s) → 반동(0.9s) → 유지 → 복귀
      attack: { length: 2, loop: true, bones: {
        body: { rotation: { 0: [0, 0, 0], 0.55: [-26, 0, 0], 0.75: [34, 0, 0], 0.9: [28, 0, 0], 1.4: [28, 0, 0], 2: [0, 0, 0] }, position: { 0: [0, 0, 0], 0.55: [0, 2, 2], 0.75: [0, -6, -4], 0.9: [0, -5, -4], 1.4: [0, -5, -4], 2: [0, 0, 0] } },
        head: { rotation: { 0: [0, 0, 0], 0.55: [-30, 0, 0], 0.75: [18, 0, 0], 2: [0, 0, 0] } },
        arm_r: { rotation: { 0: [0, 0, 0], 0.55: [-175, 0, -18], 0.75: [-10, 0, 0], 0.9: [-22, 0, 0], 1.4: [-22, 0, 0], 2: [0, 0, 0] } },
        arm_l: { rotation: { 0: [0, 0, 0], 0.55: [-175, 0, 18], 0.75: [-10, 0, 0], 0.9: [-22, 0, 0], 1.4: [-22, 0, 0], 2: [0, 0, 0] } },
        forearm_r: { rotation: { 0: [0, 0, 0], 0.55: [-35, 0, 0], 0.75: [-50, 0, 0], 2: [0, 0, 0] } },
        forearm_l: { rotation: { 0: [0, 0, 0], 0.55: [-35, 0, 0], 0.75: [-50, 0, 0], 2: [0, 0, 0] } },
        leg_r: { rotation: { 0: [0, 0, 0], 0.75: [-14, 0, 0], 1.4: [-14, 0, 0], 2: [0, 0, 0] } },
        leg_l: { rotation: { 0: [0, 0, 0], 0.75: [10, 0, 0], 1.4: [10, 0, 0], 2: [0, 0, 0] } },
        cape: { rotation: { 0: [6, 0, 0], 0.55: [-4, 0, 0], 0.75: [40, 0, 0], 1.4: [20, 0, 0], 2: [6, 0, 0] } },
      } },
    },
  };
}
