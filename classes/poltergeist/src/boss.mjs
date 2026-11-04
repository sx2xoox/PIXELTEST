// 보스 「저택의 괘종시계」 — 저택 전체의 소란이 깃든 거대한 괘종시계 (밀도 1, 높이 80 = 플레이어의 2.5배)
//  1차: 떠 있는 키 큰 시계(받침 → 몸통 → 머리 → 깨진 박공 지붕) + 양옆 엑토플라즘 팔 + 아래 연기 꼬리
//  2차: 시계판 = 얼굴(성난 민트 눈, 바늘이 눈썹처럼 V자), 유리창 속 흔들리는 진자, 몸을 감은 사슬, 주위를 도는 접시
//  3차: 마호가니 나뭇결과 판넬 몰딩, 로마 숫자 눈금, 진자 추의 민트 빛
//  명도: 마호가니·백랍(어두움) 틀 안에 아이보리 시계판(중간) → 민트 눈·진자·팔(가장 밝음)
//  애니메이션: idle(둥실·진자·접시 공전) / walk(앞으로 기울어 미끄러짐) / attack(팔을 들어 올림 → 앞으로 덮치며 내려침, 바늘 급회전)
import { PixelCanvas } from '../../../atelier/pixel.js';
import { paintFace } from '../../../atelier/mc/shade.js';
import { PEW, ECT, IVO, VEL, MAH } from './palette.mjs';

const P = paint => ({ paint });
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bayer = (x, y) => B4[(y & 3) * 4 + (x & 3)] / 16;
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
// 마호가니: 세로 나뭇결(열마다 다른 밝기 + 옹이) + 판넬 몰딩(가장자리 2칸 테, 안쪽 한 단 어둡게)
const WOOD = ({ base = 3, panel = true } = {}) => P((w, h, f) => paintFace(MAH, w, h, f, (x, y) => {
  let v = base + ((hash(x, 7) % 5) - 2) * 0.25 + ((hash(x, y >> 2) % 9) === 0 ? -0.6 : 0);
  if (panel && f !== 'up' && f !== 'down' && w > 6 && h > 6) {
    const e = Math.min(x, y, w - 1 - x, h - 1 - y);
    if (e === 1) v += x === 1 || y === 1 ? 1.3 : -1;      // 몰딩: 왼·위 밝음, 오른·아래 어두움
    else if (e > 1) v -= 0.6;                              // 안쪽 판 한 단 들어감
  }
  return v;
}, { grad: 0.6 }));
const METAL = (base = 3.4) => P((w, h, f) => paintFace(PEW, w, h, f, (x) => base + ((x + 0.5) / w < 0.3 ? 1.2 : 0)));
const GLOWM = P((w, h) => { const c = new PixelCanvas(w, h).fill(ECT[5]); c.set(0, 0, ECT[7]); return c; });
// 사슬 띠: 가로로 고리가 번갈아(세로 고리 = 밝음, 가로 고리 = 어두움)
const CHAIN = P((w, h, f) => { const c = new PixelCanvas(w, h); for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) c.set(x, y, x % 3 === 0 ? PEW[5] : x % 3 === 1 ? PEW[3] : PEW[1]); return c; });

// 몸통 정면: 마호가니 판 + 가운데 유리창(어두운 청록 속, 테두리 백랍, 유리 반사 사선)
const TRUNK = P((w, h, f) => {
  const c = WOOD({ base: 3 }).paint(w, h, f);
  if (f !== 'north') return c;
  const x0 = 4, x1 = w - 5, y0 = 3, y1 = h - 6;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const edge = x === x0 || x === x1 || y === y0 || y === y1;
    const glint = !edge && (x - y + 40) % 11 === 0 && y < y0 + 10;
    c.set(x, y, edge ? (x === x0 || y === y0 ? PEW[5] : PEW[2]) : glint ? ECT[6] : ECT[1 + ((y - y0) > (y1 - y0) * 0.7 ? 1 : 0)]);
  }
  return c;
});
// 머리 정면: 마호가니 + 둥근 시계판(아이보리, 로마 숫자 눈금 12개, 성난 민트 눈 두 개)
const HOOD = P((w, h, f) => {
  const c = WOOD({ base: 3.2 }).paint(w, h, f);
  if (f !== 'north') return c;
  const cx = w / 2, cy = h / 2 + 0.5, R = Math.min(w, h) / 2 - 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
    if (r > R + 1) continue;
    if (r > R) { c.set(x, y, PEW[(dx + dy < 0) ? 5 : 2]); continue; }                                  // 백랍 테
    const lit = -(dx + dy) / R;
    c.set(x, y, IVO[lit > 0.5 ? 5 : lit > -0.2 ? 4 : 3]);
    const a = Math.atan2(dy, dx), tick = Math.abs(((a / (Math.PI / 6)) % 1 + 1) % 1 - 0.5) > 0.42;
    if (r > R - 2 && tick) c.set(x, y, VEL[2]);                                                        // 눈금
    // 성난 눈: 바깥쪽이 올라간 기울어진 아몬드(왼쪽 눈 / 오른쪽 눈 대칭)
    for (const s of [-1, 1]) {
      const ex = dx - s * R * 0.38, ey = dy + R * 0.05 + s * ex * -0.35 * s;
      const inEye = (ex / (R * 0.27)) ** 2 + (ey / (R * 0.14)) ** 2 <= 1;
      if (inEye) c.set(x, y, Math.abs(ex) < R * 0.08 && Math.abs(ey) < R * 0.08 ? ECT[7] : ey < 0 ? ECT[4] : ECT[5]);
    }
  }
  c.set(Math.floor(cx), Math.floor(cy) + Math.round(R * 0.45), VEL[1]);                               // 아래쪽 '입' 자리의 VI 눈금 강조
  return c;
});
// 엑토플라즘 팔: 세로 줄무늬 연기 + 디더로 비치는 속, 아래쪽 가장 밝음
const ECTO = P((w, h, f) => {
  const c = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = (y + 0.5) / h, edge = x === 0 || x === w - 1;
    if (!edge && bayer(x, y) < 0.3 && f !== 'up' && f !== 'down') continue;
    c.set(x, y, ECT[Math.min(7, Math.round(3 + t * 2 + (x % 3 === 1 ? 1 : 0) + (edge ? -1 : 0)))]);
  }
  return c;
});
const CLAW = P((w, h, f) => paintFace(ECT, w, h, f, () => 5, { ao: false }));
const WISP = P((w, h, f) => { const c = new PixelCanvas(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = (y + 0.5) / h; if (f !== 'up' && bayer(x, y) < t * 0.9) continue; c.set(x, y, ECT[t < 0.3 ? 5 : t < 0.65 ? 4 : 3]); } return c; });
const PLATE = P((w, h, f) => { const c = paintFace(IVO, w, h, f, () => 4, { ao: false }); if (f === 'up') { c.rect(1, 1, w - 2, h - 2, VEL[3]); c.rect(2, 2, Math.max(1, w - 4), Math.max(1, h - 4), IVO[5]); } return c; });

export default function () {
  const hide = Object.fromEntries(['north', 'east', 'south', 'west', 'up', 'down'].map(f => [f, { hidden: true }]));
  const arm = (s, t) => {
    const X = v => v * s, box = (a, b) => (s > 0 ? { from: a, to: b } : { from: [-b[0], a[1], a[2]], to: [-a[0], b[1], b[2]] });
    return [
      { name: `arm_${t}`, bone: `arm_${t}`, ...box([11, 40, -2], [15, 48, 2]), material: ECTO, light: 12 },
      { name: `forearm_${t}`, bone: `forearm_${t}`, ...box([13, 30, -2], [17, 40, 2]), material: ECTO, light: 12 },
      { name: `hand_${t}`, bone: `forearm_${t}`, ...box([12, 25, -3], [18, 30, 3]), material: CLAW, light: 14 },
      ...[-2, 0, 2].map((z, i) => ({ name: `finger_${t}${i}`, bone: `forearm_${t}`, ...box([i === 1 ? 14 : 13 + i, 21, z - 0.5 - 0.5], [i === 1 ? 16 : 15 + i, 25, z + 0.5 + 0.5]), material: CLAW, light: 14 })),
      { name: `cuff_${t}`, bone: `arm_${t}`, ...box([10, 44, -3], [12, 49, 3]), material: METAL(3) },            // 팔이 나오는 몸통 옆 백랍 경첩
    ];
  };
  return {
    name: 'manor_clock', type: 'entity', colorBudget: 48,
    bones: [
      { name: 'hitbox', pivot: [0, 0, 0] },
      { name: 'root', pivot: [0, 0, 0] },
      { name: 'body', pivot: [0, 30, 0], parent: 'root' },
      { name: 'head', pivot: [0, 52, 0], parent: 'body' },
      { name: 'hour', pivot: [0, 62.5, -8.5], parent: 'head', rotation: [0, 0, 55] },
      { name: 'minute', pivot: [0, 62.5, -8.5], parent: 'head', rotation: [0, 0, -55] },
      { name: 'pendulum', pivot: [0, 46, -6], parent: 'body' },
      { name: 'arm_r', pivot: [11, 46, 0], parent: 'body' }, { name: 'forearm_r', pivot: [15, 40, 0], parent: 'arm_r' },
      { name: 'arm_l', pivot: [-11, 46, 0], parent: 'body' }, { name: 'forearm_l', pivot: [-15, 40, 0], parent: 'arm_l' },
      { name: 'tail', pivot: [0, 14, 0], parent: 'body' },
      { name: 'orbit', pivot: [0, 40, 0], parent: 'root' },
    ],
    cubes: [
      { name: 'hitbox', bone: 'hitbox', from: [-14, 0, -14], to: [14, 80, 14], material: { mat: 'solid', color: '#ffffff' }, faces: hide },
      // 받침 · 몸통 · 허리 띠 · 머리 · 지붕
      { name: 'plinth', bone: 'body', from: [-10, 14, -7], to: [10, 19, 7], material: WOOD({ base: 2.6 }) },
      { name: 'trunk', bone: 'body', from: [-8, 19, -6], to: [8, 50, 6], material: TRUNK },
      { name: 'waist', bone: 'body', from: [-10, 50, -7], to: [10, 52, 7], material: WOOD({ base: 3.6, panel: false }) },
      { name: 'hood', bone: 'head', from: [-11, 52, -8], to: [11, 73, 7], material: HOOD },
      { name: 'cornice', bone: 'head', from: [-12, 73, -9], to: [12, 75, 8], material: WOOD({ base: 3.8, panel: false }) },
      { name: 'ped_l', bone: 'head', from: [-12, 75, -9], to: [-5, 77, 8], material: WOOD({ base: 3.4, panel: false }) },   // 깨진 박공: 좌우만 솟고 가운데 비움
      { name: 'ped_r', bone: 'head', from: [5, 75, -9], to: [12, 77, 8], material: WOOD({ base: 3.4, panel: false }) },
      { name: 'ped_l2', bone: 'head', from: [-10, 77, -9], to: [-6, 79, 8], material: WOOD({ base: 3.6, panel: false }) },
      { name: 'ped_r2', bone: 'head', from: [6, 77, -9], to: [10, 79, 8], material: WOOD({ base: 3.6, panel: false }) },
      { name: 'finial', bone: 'head', from: [-1, 75, -2], to: [1, 80, 0], material: METAL(3.6) },
      { name: 'finial_gem', bone: 'head', from: [-1, 80, -2], to: [1, 82, 0], material: GLOWM, light: 15 },
      // 시계 바늘(눈썹처럼 V자) + 가운데 축
      { name: 'hour_hand', bone: 'hour', from: [-0.5, 62, -9], to: [0.5, 68, -8], material: METAL(2.6), faces: { south: { hidden: true } } },
      { name: 'minute_hand', bone: 'minute', from: [-0.5, 62, -9], to: [0.5, 70, -8], material: METAL(2.6), faces: { south: { hidden: true } } },
      { name: 'hub', bone: 'head', from: [-1, 61, -10], to: [1, 63, -9], material: METAL(4) },
      // 진자(유리창 앞): 막대 + 추(민트 빛)
      { name: 'rod', bone: 'pendulum', from: [-0.5, 29, -7], to: [0.5, 46, -6], material: METAL(3) },
      { name: 'bob', bone: 'pendulum', from: [-2.5, 24, -7], to: [2.5, 29, -6], material: GLOWM, light: 15 },
      // 사슬 2줄
      { name: 'chain1', bone: 'body', from: [-8.5, 30, -6.5], to: [8.5, 31, 6.5], material: CHAIN },
      { name: 'chain2', bone: 'body', from: [-8.5, 38, -6.5], to: [8.5, 39, 6.5], material: CHAIN },
      { name: 'lock', bone: 'body', from: [-1.5, 36, -7.5], to: [1.5, 39, -6.5], material: METAL(3.8) },
      ...arm(1, 'r'), ...arm(-1, 'l'),
      // 연기 꼬리
      { name: 'wisp', bone: 'tail', from: [-7, 7, -5], to: [7, 14, 5], material: WISP, light: 10 },
      { name: 'wisp_tip', bone: 'tail', from: [-3, 0, -2], to: [3, 7, 2], material: WISP, light: 8 },
      // 공전하는 접시 3개
      ...[0, 1, 2].map(i => { const a = (i / 3) * Math.PI * 2, x = Math.round(Math.cos(a) * 20), z = Math.round(Math.sin(a) * 20); return { name: `plate${i}`, bone: 'orbit', from: [x - 2, 40 + i * 6, z - 2], to: [x + 2, 41 + i * 6, z + 2], material: PLATE }; }),
    ],
    animations: {
      idle: { length: 2.4, loop: true, bones: {
        body: { position: { 0: [0, 0, 0], 1.2: [0, 2, 0], 2.4: [0, 0, 0] }, rotation: { 0: [0, 0, -1.5], 1.2: [0, 0, 1.5], 2.4: [0, 0, -1.5] } },
        pendulum: { rotation: { 0: [0, 0, 18], 0.6: [0, 0, -18], 1.2: [0, 0, 18], 1.8: [0, 0, -18], 2.4: [0, 0, 18] } },
        arm_r: { rotation: { 0: [0, 0, 10], 1.2: [-12, 0, 18], 2.4: [0, 0, 10] } },
        arm_l: { rotation: { 0: [0, 0, -10], 1.2: [-12, 0, -18], 2.4: [0, 0, -10] } },
        forearm_r: { rotation: { 0: [-10, 0, 0], 1.2: [-25, 0, 0], 2.4: [-10, 0, 0] } },
        forearm_l: { rotation: { 0: [-10, 0, 0], 1.2: [-25, 0, 0], 2.4: [-10, 0, 0] } },
        tail: { rotation: { 0: [0, 0, 6], 1.2: [0, 0, -6], 2.4: [0, 0, 6] } },
        orbit: { rotation: { 0: [0, 0, 0], 1.2: [0, 180, 0], 2.4: [0, 360, 0] } },
      } },
      walk: { length: 1.6, loop: true, bones: {
        body: { rotation: { 0: [10, 0, -3], 0.8: [10, 0, 3], 1.6: [10, 0, -3] }, position: { 0: [0, 1, 0], 0.4: [0, 2.5, 0], 0.8: [0, 1, 0], 1.2: [0, 2.5, 0], 1.6: [0, 1, 0] } },
        pendulum: { rotation: { 0: [0, 0, 28], 0.4: [0, 0, -28], 0.8: [0, 0, 28], 1.2: [0, 0, -28], 1.6: [0, 0, 28] } },
        arm_r: { rotation: { 0: [25, 0, 14], 0.8: [35, 0, 18], 1.6: [25, 0, 14] } },
        arm_l: { rotation: { 0: [25, 0, -14], 0.8: [35, 0, -18], 1.6: [25, 0, -14] } },
        tail: { rotation: { 0: [35, 0, 0], 0.8: [45, 0, 0], 1.6: [35, 0, 0] } },
        orbit: { rotation: { 0: [0, 0, 0], 1.6: [0, 360, 0] } },
      } },
      // 공격: 팔을 머리 위로(0.6s) → 앞으로 덮치며 내려침(0.8s) → 정지(1.4s) → 복귀. 바늘 급회전, 진자 크게
      attack: { length: 2, loop: true, bones: {
        body: { rotation: { 0: [0, 0, 0], 0.6: [-14, 0, 0], 0.8: [26, 0, 0], 1.4: [22, 0, 0], 2: [0, 0, 0] }, position: { 0: [0, 0, 0], 0.6: [0, 4, 3], 0.8: [0, -2, -6], 1.4: [0, -2, -6], 2: [0, 0, 0] } },
        arm_r: { rotation: { 0: [0, 0, 10], 0.6: [-170, 0, -10], 0.8: [-40, 0, 0], 1.4: [-40, 0, 0], 2: [0, 0, 10] } },
        arm_l: { rotation: { 0: [0, 0, -10], 0.6: [-170, 0, 10], 0.8: [-40, 0, 0], 1.4: [-40, 0, 0], 2: [0, 0, -10] } },
        forearm_r: { rotation: { 0: [0, 0, 0], 0.6: [-30, 0, 0], 0.8: [-60, 0, 0], 2: [0, 0, 0] } },
        forearm_l: { rotation: { 0: [0, 0, 0], 0.6: [-30, 0, 0], 0.8: [-60, 0, 0], 2: [0, 0, 0] } },
        hour: { rotation: { 0: [0, 0, 55], 0.8: [0, 0, 415], 2: [0, 0, 415] } },
        minute: { rotation: { 0: [0, 0, -55], 0.8: [0, 0, -775], 2: [0, 0, -775] } },
        pendulum: { rotation: { 0: [0, 0, 0], 0.6: [0, 0, -40], 0.8: [0, 0, 40], 1.2: [0, 0, -25], 2: [0, 0, 0] } },
        orbit: { rotation: { 0: [0, 0, 0], 2: [0, 720, 0] } },
      } },
    },
  };
}
