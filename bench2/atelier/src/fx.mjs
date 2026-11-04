// 피의 군주 이펙트 v5 — 레퍼런스의 '원리'만 가져오고 모티프는 피의 군주 고유(docs/research/reference-principles.md)
//  · v4는 매화검법의 흰 빛줄기·꽃잎을 그대로 따라 함 → v5: '액체 피 리본'(최고 명도도 흰빛이 아닌 산호색, 겉면에만 크림 반사선,
//    꼬리는 핏방울로 끊어짐) + 입자는 핏방울·박쥐. 원리(가는 선 여러 가닥, 짧은 시간, 기울인 평면 겹침, 단계적 연타)는 유지
// (v4 설명)
//  · 넓은 초승달 1장(v3) → '가늘고 긴 리본 가닥' 여러 개(흰 심 → 분홍 → 진홍 가장자리), 양끝 뾰족
//  · 한 번의 베기 = 기울기가 조금씩 다른 평면 2~4장을 1틱씩 어긋나게 겹쳐 3D로 휘감기는 궤적
//  · 피 웅덩이·결정 가시 대신 '혈화(핏빛 꽃잎)'가 궤적에서 흩날림 → 색은 단순해도 화면이 풍성
//  · 1타 수평(가닥 2) · 2타 역사선 올려베기(가닥 3, 더 큼) · 3타 내려찍기(가닥 4 + 바닥 고리 2겹 + 솟구치는 빛줄기 + 꽃잎 폭발)
import * as RB from '../../../atelier/mc/ribbon.js';
import * as V from '../../../atelier/mc/vfx.js';

const reg = (F, name, list) => { list.forEach((c, i) => (F[`${name}_${i}.png`] = c)); return list.map((_, i) => `${name}_${i}.png`); };
const loop = (list, n) => Array.from({ length: n }, (_, i) => list[i % list.length]);
const LQ = RB.RAMPS.liquid, BLOOD = { ramp: LQ, liquid: true, particle: 'drop' };
const S2 = [{ dr: 0, da: 0, w: 1, len: 1, tone: 1 }, { dr: 0.06, da: 0.08, w: 0.5, len: 0.86, tone: 0.72 }];
const S3 = [...S2, { dr: -0.07, da: 0.12, w: 0.4, len: 0.72, tone: 0.6 }];
const S4 = [...S3, { dr: 0.12, da: 0.18, w: 0.3, len: 0.6, tone: 0.5 }];
/** 한 번의 베기: 같은 궤적을 기울기만 다르게 n장 겹침 */
function swing(T, F, id, { t0, frames, at, rot, size, tilts, ...arc }) {
  tilts.forEach(([dx, dy, dz, dt, seed, strands], k) => {
    const fr = reg(F, `${id}_${k}`, RB.ribbonArc({ frames, seed, strands, ...BLOOD, ...arc, petals: k === 0 ? arc.petals ?? 10 : 3 }));
    T.push({ id: `${id}_${k}`, frames: fr, ticks_per_frame: 1, start_tick: t0 + dt, end_tick: t0 + dt + frames - 1, size: [size, size], keys: [{ tick: t0 + dt, translation: at, rotation: [rot[0] + dx, rot[1] + dy, rot[2] + dz], scale: [1, 1, 1] }, { tick: t0 + dt + frames - 1, scale: [1.08, 1.08, 1] }] });
  });
}

export function basic_attack() {
  const F = {}, T = [];
  const burst = reg(F, 'burst', RB.petalBurst({ size: 64, frames: 7, count: 14, seed: 4, ramp: LQ, particle: 'drop' }));
  const burstBig = reg(F, 'burstB', RB.petalBurst({ size: 128, frames: 9, count: 30, seed: 9, ramp: LQ, particle: 'drop' }));
  const ring = reg(F, 'ring', RB.thinRing({ size: 128, frames: 8, ramp: LQ }));
  const pillar = reg(F, 'pillar', RB.ribbonLine({ size: 64, frames: 6, angle: -90, length: 0.95, width: 0.06, petals: 4, seed: 6, ramp: LQ, particle: 'drop' }));
  // 1타: 수평 베기(오른쪽 → 왼쪽), 가닥 2 · 평면 2장
  swing(T, F, 'hit1', { t0: 2, frames: 7, at: [0, 1.2, 0], rot: [-90, 0, 0], size: 4.4, start: 15, sweep: -200, radius: 0.36, width: 0.04, petals: 8,
    tilts: [[0, 0, 0, 0, 1, S2], [14, 0, 0, 1, 2, S2.slice(0, 1)]] });
  T.push({ id: 'hit1_burst', frames: burst, ticks_per_frame: 1, start_tick: 5, end_tick: 11, size: [1.4, 1.4], billboard: 'center', keys: [{ tick: 5, translation: [-0.8, 1.25, -1.4], scale: [1, 1, 1] }] });
  // 2타: 역사선 올려베기(왼쪽 아래 → 오른쪽 위), 가닥 3 · 평면 3장, 더 크게
  swing(T, F, 'hit2', { t0: 11, frames: 7, at: [0, 1.3, -0.9], rot: [0, 0, -28], size: 5, start: 140, sweep: 200, radius: 0.36, width: 0.045, petals: 12,
    tilts: [[0, 0, 0, 0, 3, S3], [0, 18, 6, 1, 4, S2], [0, -16, -6, 1, 5, S2.slice(0, 1)]] });
  T.push({ id: 'hit2_burst', frames: burst, ticks_per_frame: 1, start_tick: 14, end_tick: 20, size: [1.7, 1.7], billboard: 'center', keys: [{ tick: 14, translation: [0.9, 2.1, -1.4], scale: [1, 1, 1] }] });
  // 3타: 머리 위에서 앞 바닥으로 내려찍기, 가닥 4 · 평면 4장 + 착지(바닥 고리 2겹, 빛줄기 5개, 큰 꽃잎 폭발)
  swing(T, F, 'hit3', { t0: 21, frames: 8, at: [0, 1.5, -0.7], rot: [0, 90, 0], size: 5.8, start: -170, sweep: 235, radius: 0.37, width: 0.05, petals: 16,
    tilts: [[0, 0, 0, 0, 7, S4], [0, 12, 0, 1, 8, S3], [0, -12, 0, 1, 9, S2], [0, 24, 0, 2, 10, S2.slice(0, 1)]] });
  const hitP = [0, 0.05, -2.4];
  T.push({ id: 'hit3_ring', frames: ring, ticks_per_frame: 2, start_tick: 26, end_tick: 41, size: [5.5, 5.5], keys: [{ tick: 26, translation: hitP, rotation: [-90, 0, 0], scale: [1, 1, 1] }] });
  T.push({ id: 'hit3_ring2', frames: ring, ticks_per_frame: 2, start_tick: 29, end_tick: 44, size: [3.6, 3.6], keys: [{ tick: 29, translation: [hitP[0], 0.06, hitP[2]], rotation: [-90, 0, 40], scale: [1, 1, 1] }] });
  T.push({ id: 'hit3_burst', frames: burstBig, ticks_per_frame: 2, start_tick: 26, end_tick: 43, size: [4.2, 4.2], billboard: 'center', keys: [{ tick: 26, translation: [hitP[0], 1.2, hitP[2]], scale: [1, 1, 1] }] });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4, r = 1.1 + (i % 2) * 0.5, t = 26 + (i % 3);
    T.push({ id: `hit3_pillar${i}`, frames: pillar, ticks_per_frame: 1, start_tick: t, end_tick: t + 5, size: [1.2, 2.6 + (i % 2)], billboard: 'vertical', keys: [{ tick: t, translation: [hitP[0] + Math.cos(a) * r, 1.2, hitP[2] + Math.sin(a) * r], scale: [1, 1, 1] }] });
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
  return { timeline: { name: '기본 공격 3연타 — 1타 수평 베기(가닥 2) · 2타 역사선 올려베기(가닥 3) · 3타 내려찍기(가닥 4 + 피의 고리 2겹 · 솟구치는 핏줄기 5개 · 핏방울 폭발)', duration_ticks: 50, tracks: T, player }, frames: F };
}

export function skill() {
  // 군주의 만찬: 사방 땅에서 피 여섯 줄기를 빨아들임 → 그 피가 리본 8가닥이 되어 몸을 휘감으며 회전 → 앞으로 X자 대참격, 박쥐 떼와 핏방울이 터짐
  const F = {}, T = [];
  const ringIn = reg(F, 'ringIn', RB.thinRing({ size: 128, frames: 8, ramp: LQ }).reverse());
  const ring = reg(F, 'ring', RB.thinRing({ size: 128, frames: 8, ramp: LQ }));
  const drops = reg(F, 'drops', RB.petalBurst({ size: 128, frames: 10, count: 34, seed: 23, ramp: LQ, particle: 'drop' }));
  const bats = reg(F, 'bats', RB.petalBurst({ size: 128, frames: 12, count: 12, seed: 24, ramp: LQ, particle: 'bat', flash: false }));
  const star = reg(F, 'star', V.impactStar({ size: 32, frames: 4 }));
  const stream = reg(F, 'stream', RB.ribbonLine({ size: 128, frames: 8, angle: -12, length: 0.95, width: 0.04, ramp: LQ, particle: 'drop', petals: 5, seed: 50 }));
  // ① 흡혈(0~14): 바닥 고리가 조여들고, 반경 3블록의 여섯 곳에서 핏줄기가 플레이어 가슴으로 빨려 들어옴
  T.push({ id: 'ringIn', frames: ringIn, ticks_per_frame: 1, start_tick: 0, end_tick: 7, size: [6.5, 6.5], keys: [{ tick: 0, translation: [0, 0.05, 0], rotation: [-90, 0, 0], scale: [1, 1, 1] }] });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * 360 + 15, ar = (a * Math.PI) / 180, t0 = 2 + (k % 3) * 2;
    T.push({ id: `stream${k}`, frames: stream, ticks_per_frame: 1, start_tick: t0, end_tick: t0 + 7, size: [3.2, 3.2], keys: [{ tick: t0, translation: [Math.cos(ar) * 1.6, 0.9, Math.sin(ar) * 1.6], rotation: [0, 180 - a, 0], scale: [1, 1, 1] }] });
  }
  // ② 휘감기(12~30): 빨아들인 피가 리본 8장이 되어 서로 다른 기울기로 몸을 감음
  const wraps = [[-90, 0, 0, 1.0], [-62, 0, 30, 1.35], [-118, 0, -40, 1.6], [-74, 0, 110, 0.65], [-106, 0, 200, 1.95], [-90, 0, 280, 1.2], [-55, 0, 160, 0.9], [-125, 0, 320, 1.5]];
  wraps.forEach(([rx, ry, rz, h], k) => {
    const t0 = 12 + k * 2, fr = reg(F, `wrap${k}`, RB.ribbonArc({ frames: 11, start: rz, sweep: k % 2 ? 320 : -320, radius: 0.36, width: 0.05, spiral: 0.18, seed: 30 + k, petals: 6, strands: k % 3 === 0 ? S4 : S3, ...BLOOD }));
    const sz = 4.2 + (k % 3) * 0.5;
    T.push({ id: `wrap${k}`, frames: fr, ticks_per_frame: 1, start_tick: t0, end_tick: t0 + 10, size: [sz, sz], keys: [{ tick: t0, translation: [0, h, 0], rotation: [rx, ry, 0], scale: [0.85, 0.85, 1] }, { tick: t0 + 10, rotation: [rx, ry, k % 2 ? 70 : -70], scale: [1.15, 1.15, 1] }] });
  });
  // ③ 대참격(31~): 앞으로 X자 피 리본 2장 + 섬광 + 박쥐 떼 + 핏방울 폭발 + 바닥 고리 2겹
  const xA = reg(F, 'xA', RB.ribbonLine({ frames: 8, angle: -38, seed: 41, petals: 10, width: 0.04, ramp: LQ, particle: 'drop' }));
  const xB = reg(F, 'xB', RB.ribbonLine({ frames: 8, angle: 38, seed: 42, petals: 10, width: 0.04, ramp: LQ, particle: 'drop' }));
  const front = [0, 1.4, -2.2];
  T.push({ id: 'xA', frames: xA, ticks_per_frame: 1, start_tick: 31, end_tick: 38, size: [6, 6], keys: [{ tick: 31, translation: front, rotation: [0, 0, 0], scale: [1, 1, 1] }] });
  T.push({ id: 'xB', frames: xB, ticks_per_frame: 1, start_tick: 33, end_tick: 40, size: [6, 6], keys: [{ tick: 33, translation: [front[0], front[1], front[2] - 0.1], rotation: [0, 0, 0], scale: [1, 1, 1] }] });
  T.push({ id: 'star', frames: star, ticks_per_frame: 1, start_tick: 34, end_tick: 37, size: [2.4, 2.4], billboard: 'center', tint: '#ff9b84', keys: [{ tick: 34, translation: front, scale: [1, 1, 1] }] });
  T.push({ id: 'drops', frames: drops, ticks_per_frame: 2, start_tick: 34, end_tick: 53, size: [6, 6], billboard: 'center', keys: [{ tick: 34, translation: front, scale: [1, 1, 1] }] });
  T.push({ id: 'bats', frames: bats, ticks_per_frame: 2, start_tick: 35, end_tick: 58, size: [4.8, 4.8], billboard: 'center', keys: [{ tick: 35, translation: [0, 1.6, -1.6], scale: [0.8, 0.8, 1] }, { tick: 58, translation: [0, 3.2, -1.6], scale: [1.2, 1.2, 1] }] });
  T.push({ id: 'ring', frames: ring, ticks_per_frame: 2, start_tick: 34, end_tick: 49, size: [7, 7], keys: [{ tick: 34, translation: [0, 0.05, -1.4], rotation: [-90, 0, 0], scale: [1, 1, 1] }] });
  T.push({ id: 'ring2', frames: ring, ticks_per_frame: 2, start_tick: 37, end_tick: 52, size: [4.5, 4.5], keys: [{ tick: 37, translation: [0, 0.06, -2.2], rotation: [-90, 0, 30], scale: [1, 1, 1] }] });
  const player = [
    { tick: 0, arm_r: [0, 0, 0], body: [0, 0, 0] },
    { tick: 8, arm_r: [-40, 0, 50], arm_l: [-40, 0, -50], body: [-8, 0, 0], head: [-15, 0, 0] },   // 두 팔을 벌려 피를 빨아들임
    { tick: 12, arm_r: [-40, 0, 50], arm_l: [-40, 0, -50], body: [-8, 0, 0], head: [-15, 0, 0] },
    { tick: 14, arm_r: [-90, 0, 0], arm_l: [0, 0, 0], body: [0, -40, 0], head: [0, 0, 0] },
    { tick: 21, arm_r: [-90, 0, 0], body: [0, 180, 0] },
    { tick: 28, arm_r: [-90, 0, 0], body: [0, 400, 0] },
    { tick: 31, arm_r: [-175, 0, 0], body: [-10, 360, 0] },
    { tick: 34, arm_r: [-30, 0, 0], body: [22, 360, 0] },
    { tick: 46, arm_r: [-20, 0, 0], body: [10, 360, 0] },
    { tick: 58, arm_r: [0, 0, 0], body: [0, 360, 0] },
  ];
  return { timeline: { name: '군주의 만찬 — 사방의 땅에서 피 여섯 줄기를 빨아들여 몸을 휘감는 피의 리본으로 두른 뒤, 앞으로 X자 대참격을 날려 박쥐 떼와 핏방울을 터뜨린다', duration_ticks: 60, tracks: T, player }, frames: F };
}
