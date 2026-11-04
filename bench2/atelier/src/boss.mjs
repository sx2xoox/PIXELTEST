// 보스 "혈해의 거상" — 피의 땅의 굳은 피와 뼈로 된 거인(약 70유닛 = 플레이어 2.2배)
// 실루엣 원칙: 넓은 어깨 + 땅에 닿을 듯한 긴 팔 + 짧고 굵은 다리 + 몸에 비해 작은 머리(위협적 비례).
// 초점은 하나: 갈비뼈 사이로 빛나는 심장. 손목의 흑철 족쇄 = 피의 군주에게 묶인 존재(서사 디테일).
import { PixelCanvas } from '../../../atelier/pixel.js';
import { flesh, bone, iron, glow, BLOOD, BONE, IRON, GLOW } from './palette.mjs';

const P = f => ({ paint: f });
// v2: 밝은 살점·흰 뼈는 위장무늬·장난감처럼 보였음 → 어두운 살점 + 바랜 뼈
const F = s => P((w, h, f) => flesh(w, h, f, { seed: s, dark: true }));
const B = s => P((w, h, f) => bone(w, h, f, { seed: s, aged: true }));
const I = P((w, h, f) => iron(w, h, f, { seed: 3 }));

export default function () {
  const bones = [
    { name: 'root', pivot: [0, 0, 0] },
    { name: 'hitbox', pivot: [0, 56, 0], parent: 'root' },
    { name: 'body', pivot: [0, 30, 0], parent: 'root', rotation: [14, 0, 0] },     // 구부정하게 앞으로
    { name: 'head', pivot: [0, 58, -8], parent: 'body' },
    { name: 'arm_r', pivot: [19, 54, -4], parent: 'body' },
    { name: 'forearm_r', pivot: [21, 36, -4], parent: 'arm_r' },
    { name: 'arm_l', pivot: [-19, 54, -4], parent: 'body' },
    { name: 'forearm_l', pivot: [-21, 36, -4], parent: 'arm_l' },
    { name: 'leg_r', pivot: [9, 28, 0], parent: 'root' },
    { name: 'leg_l', pivot: [-9, 28, 0], parent: 'root' },
  ];
  const ribs = [0, 1, 2, 3].map(i => ({ name: `rib_${i}`, bone: 'body', from: [-13, 38 + i * 4.5, -14], to: [13, 40 + i * 4.5, -12], material: B(20 + i) }));
  const spikes = [0, 1, 2].map(i => ({ name: `spine_${i}`, bone: 'body', from: [-1.5, 42 + i * 5, 10], to: [1.5, 45 + i * 5, 16 - i], material: B(30 + i) }));
  const cubes = [
    { name: 'hitbox', bone: 'hitbox', from: [-20, 0, -20], to: [20, 72, 20], material: { mat: 'solid', color: '#ffffff' }, faces: Object.fromEntries(['north', 'east', 'south', 'west', 'up', 'down'].map(f => [f, { hidden: true }])) },
    // 몸통: 살점 코어 + 앞쪽 갈비뼈 + 가운데 심장(발광) + 흉골
    { name: 'pelvis', bone: 'body', from: [-11, 26, -7], to: [11, 34, 7], material: F(1) },
    { name: 'torso', bone: 'body', from: [-16, 34, -11], to: [16, 56, 10], material: F(2) },
    // v2: 심장이 갈비뼈에 가려지고 z-fighting → 더 크게(10×10), 갈비뼈보다 한 층 뒤(-12..-11), 갈비뼈는 -14..-12
    { name: 'heart', bone: 'body', from: [-5, 39, -12], to: [5, 49, -11], material: P(glow), light: 15 },
    ...ribs,
    { name: 'sternum', bone: 'body', from: [-1, 37, -15], to: [1, 54, -14], material: B(9) },
    ...spikes,
    { name: 'shoulder_r', bone: 'body', from: [14, 50, -9], to: [24, 58, 3], material: B(11) },
    { name: 'shoulder_l', bone: 'body', from: [-24, 50, -9], to: [-14, 58, 3], material: B(12) },
    { name: 'horn_sh_r', bone: 'body', from: [18, 58, -5], to: [21, 64, -2], material: B(13) },
    { name: 'horn_sh_l', bone: 'body', from: [-21, 58, -5], to: [-18, 64, -2], material: B(14) },
    // 머리: 작은 해골 + 턱 + 눈(발광) + 뿔
    { name: 'skull', bone: 'head', from: [-6, 56, -18], to: [6, 66, -6], material: B(15),
      faces: { north: { chars: { x: 0, y: 2, rows: [
        '............',
        '.ddd....ddd.',
        '.dGd....dGd.',
        '.ddd....ddd.',
        '.....dd.....',
        '............',
        '.d.d.d.d.d..',
        '............',
      ], legend: { d: '#3a2c26', G: GLOW[2] } } } } },
    { name: 'jaw', bone: 'head', from: [-5, 53, -17], to: [5, 56, -9], material: B(16) },
    { name: 'horn_r', bone: 'head', from: [5, 64, -14], to: [8, 70, -11], material: B(17) },
    { name: 'horn_r_tip', bone: 'head', from: [7, 70, -13], to: [9, 74, -11], material: B(18) },
    { name: 'horn_l', bone: 'head', from: [-8, 64, -14], to: [-5, 70, -11], material: B(19) },
    { name: 'horn_l_tip', bone: 'head', from: [-9, 70, -13], to: [-7, 74, -11], material: B(18) },
    // 팔: 위팔(살점) → 아래팔(뼈 + 족쇄) → 손톱 3개
    { name: 'upper_r', bone: 'arm_r', from: [16, 35, -9], to: [26, 55, 1], material: F(3) },
    { name: 'fore_r', bone: 'forearm_r', from: [16, 14, -10], to: [27, 36, 1], material: B(4) },
    { name: 'cuff_r', bone: 'forearm_r', from: [15, 18, -11], to: [28, 22, 2], material: I },
    ...[0, 1, 2].map(i => ({ name: `claw_r${i}`, bone: 'forearm_r', from: [17 + i * 3.5, 6, -10], to: [19 + i * 3.5, 14, -8], material: B(40 + i) })),
    { name: 'upper_l', bone: 'arm_l', from: [-26, 35, -9], to: [-16, 55, 1], material: F(5) },
    { name: 'fore_l', bone: 'forearm_l', from: [-27, 14, -10], to: [-16, 36, 1], material: B(6) },
    { name: 'cuff_l', bone: 'forearm_l', from: [-28, 18, -11], to: [-15, 22, 2], material: I },
    ...[0, 1, 2].map(i => ({ name: `claw_l${i}`, bone: 'forearm_l', from: [-26 + i * 3.5, 6, -10], to: [-24 + i * 3.5, 14, -8], material: B(43 + i) })),
    // 다리: 짧고 굵게, 뼈 정강이 + 발톱
    { name: 'thigh_r', bone: 'leg_r', from: [3, 14, -6], to: [15, 28, 6], material: F(7) },
    { name: 'shin_r', bone: 'leg_r', from: [4, 0, -5], to: [14, 14, 5], material: B(8) },
    { name: 'toe_r', bone: 'leg_r', from: [5, 0, -9], to: [13, 3, -5], material: B(46) },
    { name: 'thigh_l', bone: 'leg_l', from: [-15, 14, -6], to: [-3, 28, 6], material: F(10) },
    { name: 'shin_l', bone: 'leg_l', from: [-14, 0, -5], to: [-4, 14, 5], material: B(47) },
    { name: 'toe_l', bone: 'leg_l', from: [-13, 0, -9], to: [-5, 3, -5], material: B(48) },
  ];
  const sym = (r, l) => ({ [r.k]: r.v, [l.k]: l.v });
  void sym;
  return {
    name: 'sanguine_colossus', type: 'entity', colorBudget: 28, bones, cubes,
    animations: {
      idle: { length: 2.4, loop: true, bones: {
        body: { rotation: { 0: [0, 0, 0], 1.2: [-3, 0, 0], 2.4: [0, 0, 0] }, position: { 0: [0, 0, 0], 1.2: [0, 0.8, 0], 2.4: [0, 0, 0] } },
        arm_r: { rotation: { 0: [0, 0, 0], 1.2: [-4, 0, 3], 2.4: [0, 0, 0] } },
        arm_l: { rotation: { 0: [0, 0, 0], 1.2: [-4, 0, -3], 2.4: [0, 0, 0] } },
        head: { rotation: { 0: [0, 0, 0], 1.2: [-6, 4, 0], 2.4: [0, 0, 0] } },
      } },
      walk: { length: 1.6, loop: true, bones: {
        leg_r: { rotation: { 0: [20, 0, 0], 0.8: [-20, 0, 0], 1.6: [20, 0, 0] } },
        leg_l: { rotation: { 0: [-20, 0, 0], 0.8: [20, 0, 0], 1.6: [-20, 0, 0] } },
        arm_r: { rotation: { 0: [-15, 0, 0], 0.8: [15, 0, 0], 1.6: [-15, 0, 0] } },
        arm_l: { rotation: { 0: [15, 0, 0], 0.8: [-15, 0, 0], 1.6: [15, 0, 0] } },
        body: { rotation: { 0: [0, 0, 3], 0.4: [0, 0, 0], 0.8: [0, 0, -3], 1.2: [0, 0, 0], 1.6: [0, 0, 3] }, position: { 0: [0, 0, 0], 0.4: [0, -1.5, 0], 0.8: [0, 0, 0], 1.2: [0, -1.5, 0], 1.6: [0, 0, 0] } },
      } },
      attack: { length: 2, loop: true, bones: {
        // 양손 내려찍기: 들어올림(0.6s) → 내려찍기(0.85s) → 충격 유지 → 복귀
        arm_r: { rotation: { 0: [0, 0, 0], 0.6: [-160, 0, -10], 0.85: [-20, 0, 0], 1.4: [-20, 0, 0], 2: [0, 0, 0] } },
        arm_l: { rotation: { 0: [0, 0, 0], 0.6: [-160, 0, 10], 0.85: [-20, 0, 0], 1.4: [-20, 0, 0], 2: [0, 0, 0] } },
        forearm_r: { rotation: { 0: [0, 0, 0], 0.6: [-30, 0, 0], 0.85: [-40, 0, 0], 2: [0, 0, 0] } },
        forearm_l: { rotation: { 0: [0, 0, 0], 0.6: [-30, 0, 0], 0.85: [-40, 0, 0], 2: [0, 0, 0] } },
        body: { rotation: { 0: [0, 0, 0], 0.6: [-14, 0, 0], 0.85: [22, 0, 0], 1.4: [22, 0, 0], 2: [0, 0, 0] }, position: { 0: [0, 0, 0], 0.85: [0, -3, -2], 1.4: [0, -3, -2], 2: [0, 0, 0] } },
        head: { rotation: { 0: [0, 0, 0], 0.6: [-20, 0, 0], 0.85: [10, 0, 0], 2: [0, 0, 0] } },
      } },
    },
  };
}
