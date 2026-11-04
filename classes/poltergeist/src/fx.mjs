// 폴터가이스트 이펙트 — 원리는 같고(가는 선 여러 가닥·짧은 시간·기울인 평면 겹침·단계적 연타) 모티프는 고유
//  궤적: 민트 '엑토플라즘 연기 리본'(꼬리가 출렁이며 디더로 흩어짐)
//  입자: 날아가며 회전하는 집기(접시·찻잔·책) — 폴터가이스트 = 물건을 집어 던지는 망령
//  타격: '노크' 동심원 파문(쿵·쿵·쿵 3겹), 스킬의 비명 지르는 망령 얼굴
import * as RB from '../../../atelier/mc/ribbon.js';
import { PixelCanvas } from '../../../atelier/pixel.js';
import { outline } from '../../../atelier/mc/shade.js';
import { OUT, ECT, IVO, VEL, MAH, PEW } from './palette.mjs';

const reg = (F, name, list) => { list.forEach((c, i) => (F[`${name}_${i}.png`] = c)); return list.map((_, i) => `${name}_${i}.png`); };
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bayer = (x, y) => B4[(y & 3) * 4 + (x & 3)] / 16;
const ECTR = ['#041a1c', '#06302f', '#0b5a55', '#13917f', '#2fd1a9', '#8cf5d0', '#c9fbe6', '#f0fffa'];

// ── 집기 스프라이트(외곽선 포함)
const sp = (rows, L) => outline(new PixelCanvas(rows[0].length + 2, rows.length + 2).chars(1, 1, rows, L), OUT);
const LO = { i: IVO[3], I: IVO[5], W: IVO[4], v: VEL[3], V: VEL[5], m: MAH[3], M: MAH[5], p: PEW[4], e: ECT[4] };
export const OBJ = {
  plate: sp(['..iii..', '.iIIIi.', 'iIvvvIi', 'iIvWvIi', 'iIvvvIi', '.iIIIi.', '..iii..'], LO),
  cup: sp(['iIIIIi..', 'IWWWWIii', 'IvvvvI.i', 'IIIIII.i', '.IIIIii.', '..iii...'], LO),
  book: sp(['MMMMMMMI', 'MmmmmmmI', 'MmVVmmmI', 'MmmmmmmI', 'MmmmmmmI', 'mmmmmmmI', '..V.....'], LO),
  fork: sp(['p.p.p', 'p.p.p', 'ppppp', '..p..', '..p..', '..p..', '..p..'], LO),
};
const ALL = [OBJ.plate, OBJ.cup, OBJ.book, OBJ.fork];
const WISP = { ramp: ECTR, wisp: true };
const S2 = [{ dr: 0, da: 0, w: 1, len: 1, tone: 1 }, { dr: 0.07, da: 0.08, w: 0.55, len: 0.85, tone: 0.7 }];
const S3 = [...S2, { dr: -0.07, da: 0.12, w: 0.45, len: 0.75, tone: 0.6 }];
const S4 = [...S3, { dr: 0.13, da: 0.18, w: 0.35, len: 0.6, tone: 0.5 }];

function swing(T, F, id, { t0, frames, at, rot, size, tilts, objects, ...arc }) {
  tilts.forEach(([dx, dy, dz, dt, seed, strands], k) => {
    const fr = reg(F, `${id}_${k}`, RB.ribbonArc({ frames, seed, strands, ...WISP, ...arc, particle: objects, petals: k === 0 ? arc.petals ?? 6 : 0 }));
    T.push({ id: `${id}_${k}`, frames: fr, ticks_per_frame: 1, start_tick: t0 + dt, end_tick: t0 + dt + frames - 1, size: [size, size], keys: [{ tick: t0 + dt, translation: at, rotation: [rot[0] + dx, rot[1] + dy, rot[2] + dz], scale: [1, 1, 1] }, { tick: t0 + dt + frames - 1, scale: [1.08, 1.08, 1] }] });
  });
}
const knock = (T, id, t, pos, size, rz = 0, frames) => T.push({ id, frames, ticks_per_frame: 1, start_tick: t, end_tick: t + frames.length - 1, size: [size, size], keys: [{ tick: t, translation: pos, rotation: [-90, 0, rz], scale: [1, 1, 1] }] });

/** 촛불 깜빡임 섬광: 민트 4갈래 + 가운데 흰 점, 3프레임 */
function flicker(size = 32) {
  return [1, 0.55, 0.25].map(e => {
    const c = new PixelCanvas(size), h = size / 2, L = size * 0.45 * e;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = Math.abs(x + 0.5 - h), dy = Math.abs(y + 0.5 - h), q = Math.min(dx, dy), m = Math.max(dx, dy);
      if (m > L || q > 1.2 * (1 - m / L) + 0.4) continue;
      c.set(x, y, ECTR[m < L * 0.3 ? 7 : m < L * 0.6 ? 6 : 4]);
    }
    return c;
  });
}

/** 집기 궤도: n개의 집기가 원을 그리며 돌고(프레임마다 각도 이동) 스스로도 회전. 기울인 평면에 올려 3D 궤도처럼 */
function orbit({ size = 128, frames = 12, n = 6, seed = 1, turn = 0.5 } = {}) {
  const out = [];
  for (let k = 0; k < frames; k++) {
    const c = new PixelCanvas(size), p = k / frames;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + p * Math.PI * 2 * turn, r = size * (0.36 + 0.04 * Math.sin(i * 2.3 + seed));
      const x = size / 2 + Math.cos(a) * r, y = size / 2 + Math.sin(a) * r;
      // 꼬리: 지나온 자리에 민트 연기 점 3개
      for (let j = 1; j <= 3; j++) { const b = a - j * 0.09; c.set(Math.round(size / 2 + Math.cos(b) * r), Math.round(size / 2 + Math.sin(b) * r), ECTR[5 - j]); }
      RB.stamp(c, ALL[(i + seed) % ALL.length], x, y, a * 1.7 + i, 1.15);
    }
    out.push(c);
  }
  return out;
}

/** 비명 지르는 망령 얼굴: 민트 타원 머리 + 아래로 흩어지는 연기 꼬리 + 길쭉한 빈 눈 + 벌어지는 입 → 디더 소멸 */
function ghostFace({ size = 96, frames = 9 } = {}) {
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / (frames - 1), open = Math.min(1, p * 2.2), fade = Math.max(0, (p - 0.55) / 0.45);
    const c = new PixelCanvas(size), cx = size / 2, cy = size * 0.42, rx = size * 0.3, ry = size * 0.34;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      let inside = dx * dx + dy * dy <= 1;
      if (!inside && dy > 0 && dy < 2.1) { const wav = 0.75 - (dy - 0.4) * 0.35 + 0.18 * Math.sin(dx * 9 + p * 8); inside = Math.abs(dx) < wav && (dy < 1.25 || bayer(x, y) < 1.9 - dy); }
      if (!inside) continue;
      if (bayer(x, y) < fade) continue;
      const eye = ((Math.abs(Math.abs(dx) - 0.38) / 0.16) ** 2 + ((dy + 0.12 + Math.abs(dx) * 0.15) / (0.3)) ** 2) <= 1;
      const mouth = ((dx / (0.18 + 0.1 * open)) ** 2 + ((dy - 0.48) / (0.12 + 0.28 * open)) ** 2) <= 1;
      if (eye || mouth) { c.set(x, y, ECTR[eye ? 0 : 1]); continue; }
      const dd = dx * dx + dy * dy, nearHole = ((Math.abs(Math.abs(dx) - 0.38) / 0.24) ** 2 + ((dy + 0.12) / 0.4) ** 2) <= 1 || ((dx / (0.28 + 0.1 * open)) ** 2 + ((dy - 0.48) / (0.2 + 0.28 * open)) ** 2) <= 1;
      if (dd < 0.72 && !nearHole && bayer(x, y) < 0.55) continue;   // 속은 반투명(디더), 가장자리·눈·입 둘레만 단단히 → 유령다운 비침
      const lit = 1 - Math.min(1, Math.hypot(dx + 0.25, dy + 0.35));
      const v = 2.6 + lit * 3.6 - Math.max(0, dy - 0.8) * 1.6 + (bayer(x, y) - 0.5) * 0.8;
      c.set(x, y, ECTR[Math.max(2, Math.min(7, Math.round(v)))]);
    }
    out.push(c);
  }
  return out;
}

export function basic_attack() {
  const F = {}, T = [];
  const ring = reg(F, 'ring', RB.thinRing({ size: 128, frames: 7, ramp: ECTR }));
  const flick = reg(F, 'flick', flicker());
  const burstS = reg(F, 'burstS', RB.petalBurst({ size: 64, frames: 7, count: 5, seed: 4, ramp: ECTR, particle: [OBJ.plate, OBJ.fork], flash: false }));
  const burstB = reg(F, 'burstB', RB.petalBurst({ size: 128, frames: 9, count: 14, seed: 9, ramp: ECTR, particle: ALL }));
  const pillar = reg(F, 'pillar', RB.ribbonLine({ size: 64, frames: 6, angle: -90, length: 0.95, width: 0.05, petals: 0, seed: 6, ramp: ECTR }));
  // 1타: 수평 휘두르기 — 연기 2가닥 + 접시가 날아감
  swing(T, F, 'hit1', { t0: 2, frames: 7, at: [0, 1.2, 0], rot: [-90, 0, 0], size: 4.4, start: 15, sweep: -200, radius: 0.36, width: 0.045, petals: 4, objects: [OBJ.plate],
    tilts: [[0, 0, 0, 0, 1, S2], [14, 0, 0, 1, 2, S2.slice(0, 1)]] });
  T.push({ id: 'hit1_flick', frames: flick, ticks_per_frame: 1, start_tick: 5, end_tick: 7, size: [1.1, 1.1], billboard: 'center', keys: [{ tick: 5, translation: [-0.8, 1.3, -1.4], scale: [1, 1, 1] }] });
  T.push({ id: 'hit1_burst', frames: burstS, ticks_per_frame: 1, start_tick: 5, end_tick: 11, size: [1.8, 1.8], billboard: 'center', keys: [{ tick: 5, translation: [-0.8, 1.3, -1.5], scale: [1, 1, 1] }] });
  // 2타: 올려치기 — 연기 3가닥 + 책·찻잔
  swing(T, F, 'hit2', { t0: 11, frames: 7, at: [0, 1.3, -0.9], rot: [0, 0, -28], size: 5, start: 140, sweep: 200, radius: 0.36, width: 0.05, petals: 6, objects: [OBJ.book, OBJ.cup],
    tilts: [[0, 0, 0, 0, 3, S3], [0, 18, 6, 1, 4, S2], [0, -16, -6, 1, 5, S2.slice(0, 1)]] });
  T.push({ id: 'hit2_flick', frames: flick, ticks_per_frame: 1, start_tick: 14, end_tick: 16, size: [1.4, 1.4], billboard: 'center', keys: [{ tick: 14, translation: [0.9, 2.1, -1.4], scale: [1, 1, 1] }] });
  T.push({ id: 'hit2_burst', frames: burstS, ticks_per_frame: 1, start_tick: 14, end_tick: 20, size: [2.2, 2.2], billboard: 'center', keys: [{ tick: 14, translation: [0.9, 2.1, -1.5], scale: [1, 1, 1] }] });
  // 3타: 내려찍기 — 연기 4가닥 + 노크 파문 3겹(쿵·쿵·쿵) + 집기 폭발 + 연기 기둥
  swing(T, F, 'hit3', { t0: 21, frames: 8, at: [0, 1.5, -0.7], rot: [0, 90, 0], size: 5.8, start: -170, sweep: 235, radius: 0.37, width: 0.055, petals: 4, objects: ALL,
    tilts: [[0, 0, 0, 0, 7, S4], [0, 12, 0, 1, 8, S3], [0, -12, 0, 1, 9, S2], [0, 24, 0, 2, 10, S2.slice(0, 1)]] });
  const hp = [0, 0.05, -2.4];
  knock(T, 'hit3_knock1', 26, hp, 3.4, 0, ring); knock(T, 'hit3_knock2', 29, [hp[0], 0.06, hp[2]], 4.6, 20, ring); knock(T, 'hit3_knock3', 32, [hp[0], 0.07, hp[2]], 5.8, 40, ring);
  T.push({ id: 'hit3_flick', frames: flick, ticks_per_frame: 1, start_tick: 26, end_tick: 28, size: [2.4, 2.4], billboard: 'center', keys: [{ tick: 26, translation: [hp[0], 0.8, hp[2]], scale: [1, 1, 1] }] });
  T.push({ id: 'hit3_burst', frames: burstB, ticks_per_frame: 2, start_tick: 26, end_tick: 43, size: [4.4, 4.4], billboard: 'center', keys: [{ tick: 26, translation: [hp[0], 1.3, hp[2]], scale: [1, 1, 1] }] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.6, t = 26 + (i % 2) * 2;
    T.push({ id: `hit3_pillar${i}`, frames: pillar, ticks_per_frame: 1, start_tick: t, end_tick: t + 5, size: [1.2, 2.8], billboard: 'vertical', keys: [{ tick: t, translation: [hp[0] + Math.cos(a) * 1.3, 1.3, hp[2] + Math.sin(a) * 1.3], scale: [1, 1, 1] }] });
  }
  const player = [
    { tick: 0, arm_r: [-70, 70, 0], body: [0, -35, 0] },
    { tick: 5, arm_r: [-80, -60, 0], body: [0, 35, 0] },
    { tick: 10, arm_r: [-20, -40, 0], body: [0, 20, 0] },
    { tick: 14, arm_r: [-165, 40, 0], body: [0, -25, 0] },
    { tick: 20, arm_r: [-175, 0, 0], body: [-12, 0, 0] },
    { tick: 25, arm_r: [-35, 0, 0], body: [22, 0, 0] },
    { tick: 36, arm_r: [-30, 0, 0], body: [12, 0, 0] },
    { tick: 48, arm_r: [0, 0, 0], body: [0, 0, 0] },
  ];
  return { timeline: { name: '기본 공격 3연타 — 1타 수평 휘두르기(연기 2가닥 + 접시) · 2타 올려치기(3가닥 + 책·찻잔) · 3타 내려찍기(4가닥 + 노크 파문 3겹 · 집기 폭발 · 연기 기둥)', duration_ticks: 50, tracks: T, player }, frames: F };
}

export function skill() {
  // 한밤의 소란: 쿵·쿵·쿵 노크와 촛불 깜빡임 → 집기들이 기울어진 세 궤도로 떠올라 몸 주위를 돌고 연기가 휘감음 → 비명 지르는 망령 얼굴 → 모든 집기가 사방으로 날아감
  const F = {}, T = [];
  const ring = reg(F, 'ring', RB.thinRing({ size: 128, frames: 7, ramp: ECTR }));
  const flick = reg(F, 'flick', flicker());
  const face = reg(F, 'face', ghostFace());
  const burst = reg(F, 'burst', RB.petalBurst({ size: 128, frames: 11, count: 26, seed: 31, ramp: ECTR, particle: ALL }));
  const ray = reg(F, 'ray', RB.ribbonLine({ size: 128, frames: 7, angle: 0, length: 0.95, width: 0.035, ramp: ECTR, particle: ALL, petals: 2, seed: 61 }));
  // ① 노크(0~10)
  [0, 4, 8].forEach((t, i) => knock(T, `knock${i}`, t, [0, 0.05 + i * 0.01, 0], 3 + i * 1.2, i * 25, ring));
  [[1.2, 2.4, -0.6, 2], [-1.3, 2.1, 0.4, 5], [0.3, 2.8, 1.2, 8]].forEach(([x, y, z, t], i) => T.push({ id: `flick${i}`, frames: flick, ticks_per_frame: 1, start_tick: t, end_tick: t + 2, size: [0.9, 0.9], billboard: 'center', keys: [{ tick: t, translation: [x, y, z], scale: [1, 1, 1] }] }));
  // ② 떠오르는 궤도(8~31): 기울기 다른 3개의 집기 궤도 + 연기 리본 4장
  [[-90, 0, 0, 1.0, 1], [-60, 0, 35, 1.6, 2], [-120, 0, -30, 2.1, 3]].forEach(([rx, ry, rz, h, seed], k) => {
    const fr = reg(F, `orbit${k}`, orbit({ seed, n: 5 + k, turn: k % 2 ? -0.5 : 0.5 }));
    const t0 = 8 + k * 2, seq = [...fr, ...fr];
    T.push({ id: `orbit${k}`, frames: seq, ticks_per_frame: 1, start_tick: t0, end_tick: t0 + seq.length - 1, size: [3.6 + k * 0.4, 3.6 + k * 0.4], keys: [{ tick: t0, translation: [0, h - 0.6, 0], rotation: [rx, ry, rz], scale: [0.5, 0.5, 1] }, { tick: t0 + 6, translation: [0, h, 0], scale: [1, 1, 1] }, { tick: t0 + seq.length - 1, rotation: [rx, ry, rz + (k % 2 ? -40 : 40)] }] });
  });
  [[-70, 0, 0, 1.1], [-110, 0, 120, 1.7], [-80, 0, 240, 0.7], [-100, 0, 60, 2.2]].forEach(([rx, ry, rz, h], k) => {
    const t0 = 12 + k * 3, fr = reg(F, `wrap${k}`, RB.ribbonArc({ frames: 11, start: rz, sweep: k % 2 ? 320 : -320, radius: 0.36, width: 0.05, spiral: 0.18, seed: 40 + k, petals: 0, strands: k % 2 ? S3 : S4, ...WISP }));
    T.push({ id: `wrap${k}`, frames: fr, ticks_per_frame: 1, start_tick: t0, end_tick: t0 + 10, size: [4.4, 4.4], keys: [{ tick: t0, translation: [0, h, 0], rotation: [rx, ry, 0], scale: [0.9, 0.9, 1] }, { tick: t0 + 10, rotation: [rx, ry, k % 2 ? 70 : -70], scale: [1.15, 1.15, 1] }] });
  });
  // ③ 비명(28~38): 망령 얼굴이 앞 위쪽에 번쩍 커지며 나타났다 흩어짐
  T.push({ id: 'face', frames: face, ticks_per_frame: 1, start_tick: 28, end_tick: 36, size: [2.6, 2.6], billboard: 'center', keys: [{ tick: 28, translation: [0, 3.1, -1.2], scale: [0.5, 0.5, 1] }, { tick: 31, scale: [1.1, 1.1, 1] }, { tick: 36, translation: [0, 3.4, -1.4], scale: [1.25, 1.25, 1] }] });
  // ④ 분출(32~): 모든 집기가 사방으로 — 집기 폭발 + 수평 광선 6줄 + 큰 노크 파문 2겹
  T.push({ id: 'burst', frames: burst, ticks_per_frame: 2, start_tick: 32, end_tick: 53, size: [7, 7], billboard: 'center', keys: [{ tick: 32, translation: [0, 1.3, 0], scale: [1, 1, 1] }] });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * 360 + 30, ar = (a * Math.PI) / 180, t0 = 32 + (k % 2);
    T.push({ id: `ray${k}`, frames: ray, ticks_per_frame: 1, start_tick: t0, end_tick: t0 + 6, size: [4, 4], keys: [{ tick: t0, translation: [Math.cos(ar) * 2.1, 1.2, Math.sin(ar) * 2.1], rotation: [0, -a, 0], scale: [1, 1, 1] }] });
  }
  knock(T, 'knockB1', 32, [0, 0.05, 0], 7, 0, ring); knock(T, 'knockB2', 36, [0, 0.06, 0], 9, 30, ring);
  const player = [
    { tick: 0, arm_r: [0, 0, 0], body: [0, 0, 0] },
    { tick: 8, arm_r: [-150, 0, 25], arm_l: [-150, 0, -25], body: [-6, 0, 0], head: [-20, 0, 0] },   // 두 팔을 들어 염동력
    { tick: 20, arm_r: [-160, 0, 35], arm_l: [-160, 0, -35], body: [-10, 0, 0], head: [-25, 0, 0] },
    { tick: 28, arm_r: [-170, 0, 10], arm_l: [-170, 0, -10], body: [-14, 0, 0], head: [-30, 0, 0] },
    { tick: 32, arm_r: [-80, 0, 70], arm_l: [-80, 0, -70], body: [12, 0, 0], head: [8, 0, 0] },       // 사방으로 내던짐
    { tick: 46, arm_r: [-40, 0, 40], arm_l: [-40, 0, -40], body: [6, 0, 0], head: [0, 0, 0] },
    { tick: 58, arm_r: [0, 0, 0], arm_l: [0, 0, 0], body: [0, 0, 0], head: [0, 0, 0] },
  ];
  return { timeline: { name: '한밤의 소란 — 쿵·쿵·쿵 노크와 함께 집기들이 세 궤도로 떠올라 몸 주위를 돌고, 비명 지르는 망령 얼굴이 번쩍인 뒤 모든 집기가 사방으로 날아간다', duration_ticks: 60, tracks: T, player }, frames: F };
}
