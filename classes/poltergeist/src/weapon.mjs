// 무기 「소란의 촛대」 — 3D 큐브 모델 + 면마다 손으로 칠한 스킨(밀도 4: 1유닛 = 4텍셀)
// 사용자 피드백: "픽셀을 겹쳐 놓은 디자인(스프라이트 돌출)보다 3D 기반 모델링 + 스킨이 낫다"
//  → 부피 있는 큐브와 본 사슬(팔꿈치 회전)로 형태를 만들고, 재질마다 다른 칠 규칙으로 스킨을 입힌다.
//  1차: 긴 백랍 자루 + 세 갈래 촛대(가운데 높게, 양팔은 바깥으로 나갔다 45°로 꺾여 올라감)
//  2차: 받침 접시·초 3자루(촛농 흘러내림)·민트 유령 불꽃, 팔에 매달린 열쇠와 종, 돌림 장식 마디, 발톱이 쥔 수정구 폼멜
//  3차: 다마스크 각인, 원기둥 반사선, 불꽃 흰 심, 벨벳 사선 감개
// 규약: 쥐는 점 = 원점, 자루 +Y. 팔은 ±Z로 뻗음. ModelEngine: 큐브 회전 없이 본 회전만 사용
import { PixelCanvas } from '../../../atelier/pixel.js';
import { paintFace, outline } from '../../../atelier/mc/shade.js';
import { placeInSlot } from '../../../atelier/mc/slotfit.js';
import { OUT, PEW, ECT, IVO, VEL } from './palette.mjs';

const D = 4;
const P = paint => ({ paint });
// 원기둥처럼 보이는 금속 면: 가로 위치에 따라 반사선(왼쪽 1/4) · 몸통 · 어두운 오른쪽
const cyl = (R, base = 3) => (x, y, w) => { const u = (x + 0.5) / w; return base + (u < 0.15 ? 0.6 : u < 0.4 ? 2.2 : u < 0.75 ? 0.6 : -0.9); };
const metal = (base = 3) => P((w, h, f) => paintFace(PEW, w, h, f, f === 'up' || f === 'down' ? () => base : cyl(PEW, base), { grad: 0.5 }));
const solid = (col, spec) => P((w, h) => { const c = new PixelCanvas(w, h).fill(col); if (spec) c.set(0, 0, spec); return c; });

// 자루: 다마스크 각인(12텍셀 간격 마름모) + 손잡이 벨벳 사선 감개(원점 근처)
const SHAFT = P((w, h, f) => {
  const c = paintFace(PEW, w, h, f, f === 'up' || f === 'down' ? () => 3 : cyl(PEW, 2.6), { grad: 0.3, rim: false, ao: false });
  if (f === 'up' || f === 'down') return c;
  const gripTop = h - 1 - (14 + 5) * D, gripBot = h - 1 - (14 - 6) * D;      // 자루 아래 끝이 y=-14 → 손잡이 y -6 ~ +5
  for (let y = 0; y < h; y++) {
    if (y > gripTop && y < gripBot) { for (let x = 0; x < w; x++) { const ph = (y + x) % 5; c.set(x, y, ph === 0 ? VEL[1] : x === 1 ? VEL[5] : x < 3 ? VEL[4] : VEL[3]); } continue; }
    const k = y % 12;
    if (y < gripTop - 6 && k < 5) { const half = k < 3 ? k : 4 - k, m = w >> 1; c.set(m - 1 - half, y, PEW[1]); c.set(m + half, y, PEW[1]); if (k === 2) c.set(m - 1, y, PEW[6]); }
  }
  return c;
});
// 초: 아이보리 밀랍 원기둥 + 위 녹은 홈 + 흘러내린 촛농 줄기(면마다 다른 위치)
const CANDLE = P((w, h, f) => {
  const c = paintFace(IVO, w, h, f, f === 'up' ? (x, y) => (x > 0 && y > 0 && x < w - 1 && y < h - 1 ? 2 : 4) : cyl(IVO, 2.6), { grad: 0.4 });
  if (f === 'up' || f === 'down') return c;
  const seed = { north: 1, east: 4, south: 2, west: 6 }[f];
  for (const dx of [seed % w, (seed * 3 + 2) % w]) { const len = 3 + ((dx + seed) % 4) * 2; for (let y = 0; y < len; y++) c.set(dx, y, IVO[5]); c.set(dx, len, IVO[4]); }
  return c;
});
// 유령 불꽃: 면마다 물방울 불꽃을 그리고 바깥은 투명 → 어느 방향에서 봐도 불꽃 실루엣. 가장자리 청록 → 민트 → 흰 심
const FLAME = P((w, h, f) => {
  const c = new PixelCanvas(w, h);
  if (f === 'down') return c.fill(ECT[3]);
  if (f === 'up') { c.set(w >> 1, h >> 1, ECT[6]); return c; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = 1 - (y + 0.5) / h;                                   // 0 아래 → 1 위
    const half = (w / 2) * (v < 0.35 ? Math.sqrt(Math.max(0, 1 - ((0.35 - v) / 0.35) ** 2)) : (1 - (v - 0.35) / 0.65) ** 1.15);
    const d = Math.abs(x + 0.5 - w / 2 - (v > 0.7 ? 0.5 : 0)) / Math.max(0.4, half);
    if (d > 1) continue;
    const k = Math.round((1 - d) * 3.6 + (v < 0.45 ? 2.6 : 1.2));
    c.set(x, y, ECT[Math.max(2, Math.min(7, k))]);
  }
  return c;
});
/** 불꽃 = 두께 0인 평면 2장을 십자로 교차(바닐라 횃불 불처럼) → 어느 각도에서도 한 개의 불꽃 실루엣 */
const flameX = (name, bone, cx, y0, cz, w, h) => [
  { name: `${name}_a`, bone, from: [cx - w / 2, y0, cz], to: [cx + w / 2, y0 + h, cz], material: FLAME, light: 15 },
  { name: `${name}_b`, bone, from: [cx, y0, cz - w / 2], to: [cx, y0 + h, cz + w / 2], material: FLAME, light: 15 },
];
const ORB = P((w, h, f) => paintFace(ECT, w, h, f, (x, y) => { const dx = (x + 0.5) / w - 0.35, dy = (y + 0.5) / h - 0.3; return 5.2 - Math.hypot(dx, dy) * 6; }, { rim: false, ao: false, grad: 0 }));

/** 한쪽 팔(+Z). 반대쪽은 z 부호를 뒤집어 대칭 복사 */
function armSide(s, tag) {
  const z = v => v * s;
  const at = (a, b) => (s > 0 ? { from: a, to: b } : { from: [a[0], a[1], -b[2]], to: [b[0], b[1], -a[2]] });
  return {
    bones: [
      { name: `arm_${tag}`, pivot: [0, 23, 0], parent: 'head' },
      { name: `elbow_${tag}`, pivot: [0, 23, z(5)], parent: `arm_${tag}`, rotation: [s * -45, 0, 0] },
      { name: `cup_${tag}`, pivot: [0, 23, z(7.5)], parent: 'head' },
      { name: `chain_${tag}`, pivot: [0, 22.5, z(4)], parent: `arm_${tag}` },
    ],
    cubes: [
      { name: `bar_${tag}`, bone: `arm_${tag}`, ...at([-0.5, 22.5, 1.5], [0.5, 23.5, 5.25]), material: metal(3) },
      { name: `elbow_${tag}`, bone: `elbow_${tag}`, ...at([-0.5, 22.5, 4.75], [0.5, 23.5, 8.25]), material: metal(3.2) },
      { name: `post_${tag}`, bone: `cup_${tag}`, ...at([-0.5, 25, 7], [0.5, 26.5, 8]), material: metal(3) },
      { name: `pan_${tag}`, bone: `cup_${tag}`, ...at([-1.5, 26.5, 6], [1.5, 27.25, 9]), material: metal(3.6) },
      { name: `candle_${tag}`, bone: `cup_${tag}`, ...at([-0.75, 27.25, 6.75], [0.75, 31.75, 8.25]), material: CANDLE },
      ...flameX(`flame_${tag}`, 'flame', 0, 31.75, z(7.5), 2.5, 3.75),
      ...[0, 1, 2].map(i => ({ name: `link_${tag}${i}`, bone: `chain_${tag}`, ...at(i % 2 ? [-0.25, 21.25 - i * 1.25, 3.75] : [-0.5, 21.25 - i * 1.25, 3.75], i % 2 ? [0.25, 22.5 - i * 1.25, 4.25] : [0.5, 22.5 - i * 1.25, 4.25]), material: metal(i % 2 ? 2.4 : 3.4) })),
      ...(s > 0
        ? [ // 종: 아래로 넓어지는 3단 + 민트 추
          { name: 'bell_top', bone: `chain_${tag}`, ...at([-0.5, 17.75, 3.5], [0.5, 18.5, 4.5]), material: metal(3.4) },
          { name: 'bell_mid', bone: `chain_${tag}`, ...at([-0.75, 16.75, 3.25], [0.75, 17.75, 4.75]), material: metal(3) },
          { name: 'bell_rim', bone: `chain_${tag}`, ...at([-1, 16, 3], [1, 16.75, 5]), material: metal(3.6) },
          { name: 'bell_clapper', bone: `chain_${tag}`, ...at([-0.25, 15.5, 3.75], [0.25, 16, 4.25]), material: solid(ECT[5]), light: 12 },
        ]
        : [ // 열쇠: 속 빈 고리 + 축 + 이빨 2개
          { name: 'key_bow_t', bone: `chain_${tag}`, ...at([-0.25, 18.25, 3.25], [0.25, 18.5, 4.75]), material: metal(3.6) },
          { name: 'key_bow_b', bone: `chain_${tag}`, ...at([-0.25, 17, 3.25], [0.25, 17.25, 4.75]), material: metal(3) },
          { name: 'key_bow_l', bone: `chain_${tag}`, ...at([-0.25, 17.25, 3.25], [0.25, 18.25, 3.5]), material: metal(3) },
          { name: 'key_bow_r', bone: `chain_${tag}`, ...at([-0.25, 17.25, 4.5], [0.25, 18.25, 4.75]), material: metal(3) },
          { name: 'key_shaft', bone: `chain_${tag}`, ...at([-0.25, 13.5, 3.75], [0.25, 17, 4.25]), material: metal(3.2) },
          { name: 'key_bit1', bone: `chain_${tag}`, ...at([-0.25, 14.25, 4.25], [0.25, 14.75, 5]), material: metal(3) },
          { name: 'key_bit2', bone: `chain_${tag}`, ...at([-0.25, 13.5, 4.25], [0.25, 13.75, 4.75]), material: metal(3) },
        ]),
    ],
  };
}

export default function () {
  const R = armSide(1, 'r'), L = armSide(-1, 'l');
  const bones = [
    { name: 'staff', pivot: [0, 0, 0] },
    { name: 'head', pivot: [0, 22, 0], parent: 'staff' },
    { name: 'flame', pivot: [0, 32, 0], parent: 'head' },
    ...R.bones, ...L.bones,
  ];
  const ring = (name, y, r = 1) => ({ name, bone: 'staff', from: [-r, y, -r], to: [r, y + 0.5, r], material: metal(4) });
  const cubes = [
    { name: 'shaft', bone: 'staff', from: [-0.75, -14, -0.75], to: [0.75, 22, 0.75], material: SHAFT },
    ring('ring_grip_b', -6.5), ring('ring_grip_t', 5),
    { name: 'knop_neck_b', bone: 'staff', from: [-1, 9.5, -1], to: [1, 10, 1], material: metal(3) },
    { name: 'knop', bone: 'staff', from: [-1.5, 10, -1.5], to: [1.5, 12, 1.5], material: metal(3.2) },
    { name: 'knop_neck_t', bone: 'staff', from: [-1, 12, -1], to: [1, 12.5, 1], material: metal(3) },
    { name: 'knop2', bone: 'staff', from: [-1.25, 16, -1.25], to: [1.25, 17, 1.25], material: metal(3.4) },
    { name: 'hub', bone: 'head', from: [-1.5, 22, -1.5], to: [1.5, 24, 1.5], material: metal(3.4) },
    { name: 'hub_gem', bone: 'head', from: [-0.5, 22.5, -1.75], to: [0.5, 23.5, -1.5], material: solid(ECT[4], ECT[6]), light: 12 },
    { name: 'hub_gem_b', bone: 'head', from: [-0.5, 22.5, 1.5], to: [0.5, 23.5, 1.75], material: solid(ECT[4], ECT[6]), light: 12 },
    { name: 'column', bone: 'head', from: [-0.75, 24, -0.75], to: [0.75, 28, 0.75], material: metal(2.8) },
    { name: 'col_knop', bone: 'head', from: [-1.25, 25.5, -1.25], to: [1.25, 26.5, 1.25], material: metal(3.6) },
    { name: 'pan_c', bone: 'head', from: [-2, 28, -2], to: [2, 28.75, 2], material: metal(3.6) },
    { name: 'candle_c', bone: 'head', from: [-1, 28.75, -1], to: [1, 34.75, 1], material: CANDLE },
    ...flameX('flame_c', 'flame', 0, 34.75, 0, 3, 5),
    ...R.cubes, ...L.cubes,
    { name: 'claw_cap', bone: 'staff', from: [-1.25, -14.5, -1.25], to: [1.25, -14, 1.25], material: metal(3.6) },
    { name: 'claw_r', bone: 'staff', from: [1, -17, -0.25], to: [1.5, -14.5, 0.25], material: metal(3.4) },
    { name: 'claw_l', bone: 'staff', from: [-1.5, -17, -0.25], to: [-1, -14.5, 0.25], material: metal(3.4) },
    { name: 'claw_f', bone: 'staff', from: [-0.25, -17, -1.5], to: [0.25, -14.5, -1], material: metal(3.4) },
    { name: 'claw_b', bone: 'staff', from: [-0.25, -17, 1], to: [0.25, -14.5, 1.5], material: metal(3.4) },
    { name: 'orb', bone: 'staff', from: [-1, -17.5, -1], to: [1, -15, 1], material: ORB, light: 10 },
  ];
  return { name: 'uproar_candelabra', type: 'entity', density: D, colorBudget: 40, bones, cubes, animations: {} };
}

/** 인벤토리 아이콘 16×16: 대각선 지팡이 위 세 갈래 촛대(불꽃 3개가 초점), 아래 민트 구. 외곽선 자동 */
export function icon() {
  const L = { p: PEW[3], P: PEW[5], q: PEW[2], w: IVO[4], W: IVO[5], e: ECT[3], E: ECT[5], f: ECT[7], v: VEL[4] };
  // v2(칸 맞춤): 불꽃 십자 후광을 빼고 촛대를 12px 안으로 — 이전엔 16×16 꽉 차고(채움 0.50) 질량이 왼쪽 위로 쏠렸다(−1.4/−1.1)
  const c = new PixelCanvas(16).chars(0, 0, [
    '................',
    '.......f........',
    '..f....E...f....',
    '..E...wW...E....',
    '..wW..wW..wW....',
    '.PppP.wW.PppP...',
    '...PPPpqPPP.....',
    '......Pq........',
    '.....Pq.........',
    '....vq..........',
    '...vq...........',
    '..Pq............',
    '.Ee.............',
    '................',
    '................',
    '................',
  ], L);
  return placeInSlot(outline(c, OUT), 'tool');
}
