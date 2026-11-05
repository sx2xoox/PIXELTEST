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
import * as FB from '../../../atelier/mc/flipbook.js';
import { PixelCanvas } from '../../../atelier/pixel.js';

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
  // 군주의 만찬 v6 — 공식 파티클 문법 + RPG 스킬 레퍼런스 수치(docs/research/minecraft-official-study.md, mc-rpg-vfx-references.md)
  //  v5 측정: 흰 심 0~3%, 채도 1.0~1.24(과포화), 평면 그림뿐 → v6: 흰 심이 구워진 3D 리본, 한 색 계열 + 흰색, 층 5개, 크기 키의 2~3배
  //  ① 예비(0~14): 바닥 혈인(앵커)이 돌며 펼쳐지고, 반경 3.5블록 여섯 곳에서 핏줄기(3D 곡선 리본)가 가슴으로 빨려 듦 + 수렴하는 점
  //  ② 응축(14~16): 가슴에서 타격 섬광 1틱
  //  ③ 휘감기(16~30): 피의 리본 4가닥이 나선으로 몸을 감아 오름(높이 0.2→2.8) + 불티
  //  ④ 해방(30~36): 앞으로 X자 대참격(세로 리본 2장) + 큰 섬광 + 바닥 충격 고리 2겹
  //  ⑤ 소멸(36~60): 핏방울이 중력으로 떨어지고 박쥐가 흩어지며, 고리는 조각나 사라짐
  const F = {}, T = [];
  const strip = reg(F, 'strip', [FB.ribbonStrip({ glow: '#ff3446', edge: '#4a0010', core: 0.36, seed: 1 })]);
  const thin = reg(F, 'thin', [FB.ribbonStrip({ glow: '#ff5464', edge: '#5a0418', core: 0.44, streaks: 2, seed: 4 })]);
  const imp = reg(F, 'imp', FB.impact()), spk = reg(F, 'spk', FB.spark()), mot = reg(F, 'mot', FB.mote()), puf = reg(F, 'puf', FB.puff());
  const batF = reg(F, 'bat', [0, 1].map(k => { const c = new PixelCanvas(12, 8); RB.bat(c, 6, 4, 1, k); return c; }));
  const sigil = reg(F, 'sigil', V.magicCircle({ size: 64, folds: 7, frames: 1, seed: 9 }));
  const ring = reg(F, 'ring', RB.thinRing({ size: 128, frames: 8, ramp: ['#20040b', '#4a0010', '#a3162f', '#ff2a3c', '#ff8090', '#ffd0d6', '#ffffff', '#ffffff'] }));
  const BLOODC = [[0, '#ffffff'], [0.18, '#ffd0d6'], [0.45, '#ff2a3c'], [1, '#4a0010']];
  const chest = [0, 1.4, 0];
  // ① 바닥 혈인 + 빨려 드는 핏줄기 6개 + 수렴 점
  T.push({ id: 'sigil', frames: sigil, start_tick: 0, end_tick: 44, size: [5.5, 5.5], tint: '#7a2430', keys: [{ tick: 0, translation: [0, 0.04, 0], rotation: [-90, 0, 0], scale: [0.3, 0.3, 1] }, { tick: 10, scale: [1, 1, 1], rotation: [-90, 0, 60] }, { tick: 30, rotation: [-90, 0, 200] }, { tick: 44, scale: [1.15, 1.15, 1], rotation: [-90, 0, 260] }] });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3, x = Math.cos(a) * 3.5, z = Math.sin(a) * 3.5, t0 = 1 + (k % 3) * 2;
    T.push({ id: `stream${k}`, type: 'ribbon', frames: thin, start_tick: t0, head_ticks: 7, tail_delay: 4, end_tick: t0 + 12, face: 'camera', width: 0.45,
      points: [[x, 0.05, z], [x * 0.75, 0.6, z * 0.75], [x * 0.35 + Math.sin(a) * 0.6, 1.5, z * 0.35 - Math.cos(a) * 0.6], chest] });
  }
  T.push({ id: 'gather', type: 'emitter', start_tick: 0, frames: mot, count: 40, emit_ticks: 10, shape: { type: 'sphere', radius: 3, surface: true }, at: chest, direction: 'outward', speed: [-7, -5.5], lifetime: [0.4, 0.5], size: [0.07, 0.13], colors: [[0, '#4a0010'], [0.7, '#ff2a3c'], [1, '#ffffff']], seed: 11 });
  // ② 응축 섬광(작게, 1틱 타격 프레임 포함)
  T.push({ id: 'charge', frames: imp.slice(4, 9), ticks_per_frame: 1, start_tick: 12, end_tick: 16, size: [1.2, 1.2], billboard: 'center', tint: '#ffe0e4', keys: [{ tick: 12, translation: chest, scale: [1, 1, 1] }] });
  // ③ 휘감는 나선 리본 4가닥
  [[0, 1], [90, -1], [180, 1], [270, -1]].forEach(([st, dir], k) => {
    const t0 = 16 + k;
    T.push({ id: `wrap${k}`, type: 'ribbon', frames: k % 2 ? thin : strip, start_tick: t0, head_ticks: 8, tail_delay: 4, end_tick: t0 + 14, center: [0, 0.2, 0], radius: 1.5 + (k % 2) * 0.35, start: st, sweep: 540 * dir, spiral: 0.35, rise: 2.6, tilt: [0, 0, k % 2 ? 6 : -6], width: k % 2 ? 0.4 : 0.85 });
  });
  T.push({ id: 'wrapSparks', type: 'emitter', start_tick: 17, frames: spk, count: 30, emit_ticks: 12, shape: { type: 'disc', radius: 1.7 }, at: [0, 1.2, 0], direction: 'outward', spread: 25, speed: [2, 4], drag: 3, gravity: -2, lifetime: [0.3, 0.6], size: [0.09, 0.17], sizeEnd: 0.4, colors: BLOODC, seed: 13 });
  // ④ 해방: 앞으로 X자 대참격(세로 평면 원호 2장) + 섬광 + 바닥 고리
  const front = [0, 1.5, -2.6];
  // 대각선 베기: 왼쪽 위 → 앞 가운데 → 오른쪽 아래(살짝 휘어짐), 띠 면은 앞을 봄
  T.push({ id: 'xA', type: 'ribbon', frames: strip, start_tick: 30, head_ticks: 3, tail_delay: 2, end_tick: 38, normal: [0, 0, 1], width: 1.0, points: [[-2.4, 3.2, -1.7], [-0.9, 2.2, -2.5], [0.4, 1.2, -2.7], [2.2, 0.15, -2.0]] });
  T.push({ id: 'xB', type: 'ribbon', frames: strip, start_tick: 32, head_ticks: 3, tail_delay: 2, end_tick: 40, normal: [0, 0, 1], width: 1.0, points: [[2.4, 3.2, -1.7], [0.9, 2.2, -2.5], [-0.4, 1.2, -2.7], [-2.2, 0.15, -2.0]] });
  T.push({ id: 'burst', frames: imp.slice(5), ticks_per_frame: 1, start_tick: 34, end_tick: 42, size: [2.2, 2.2], billboard: 'center', tint: '#ffd0d6', keys: [{ tick: 34, translation: front, scale: [1, 1, 1] }] });
  T.push({ id: 'ring1', frames: ring, ticks_per_frame: 2, start_tick: 34, end_tick: 49, size: [7, 7], keys: [{ tick: 34, translation: [0, 0.05, -1.6], rotation: [-90, 0, 0], scale: [1, 1, 1] }] });
  T.push({ id: 'ring2', frames: ring, ticks_per_frame: 2, start_tick: 37, end_tick: 52, size: [4.5, 4.5], keys: [{ tick: 37, translation: [0, 0.06, -2.6], rotation: [-90, 0, 30], scale: [1, 1, 1] }] });
  T.push({ id: 'burstSparks', type: 'emitter', start_tick: 34, frames: spk, count: 40, shape: { type: 'sphere', radius: 0.2 }, at: front, direction: 'outward', speed: [7, 13], drag: 5, gravity: -6, lifetime: [0.35, 0.7], size: [0.12, 0.24], sizeEnd: 0.4, colors: BLOODC, seed: 17 });
  // ⑤ 소멸: 핏방울(크기 3단계) + 박쥐 + 피안개
  T.push({ id: 'dropsL', type: 'emitter', start_tick: 34, frames: mot, count: 6, shape: { type: 'sphere', radius: 0.3 }, at: front, direction: 'outward', spread: 30, speed: [3, 5], drag: 0.8, gravity: -18, lifetime: [0.9, 1.2], size: [0.2, 0.28], colors: [[0, '#ff3040'], [1, '#4a0010']], seed: 19 });
  T.push({ id: 'dropsS', type: 'emitter', start_tick: 34, frames: mot, count: 30, shape: { type: 'sphere', radius: 0.3 }, at: front, direction: 'outward', spread: 30, speed: [2.5, 6], drag: 1, gravity: -18, lifetime: [0.6, 1.1], size: [0.05, 0.1], colors: [[0, '#ff5060'], [1, '#4a0010']], seed: 21 });
  T.push({ id: 'bats', type: 'emitter', start_tick: 35, frames: batF, fps: 10, count: 9, shape: { type: 'sphere', radius: 0.4 }, at: front, direction: [0, 1, 0.2], spread: 70, speed: [2.5, 4], drag: 0.6, gravity: 1.5, lifetime: [1, 1.4], size: [0.35, 0.5], colors: [[0, '#ffffff'], [1, '#ffffff']], seed: 23 });
  T.push({ id: 'mist', type: 'emitter', start_tick: 36, frames: puf, count: 10, emit_ticks: 6, shape: { type: 'disc', radius: 1.6 }, at: [0, 0.2, -1.8], direction: 'up', spread: 25, speed: [0.5, 1.2], drag: 2, lifetime: [0.8, 1.2], size: [0.4, 0.7], sizeEnd: 1.6, colors: [[0, '#a3162f'], [0.5, '#590b1e'], [1, '#20040b']], seed: 25 });
  const player = [
    { tick: 0, arm_r: [0, 0, 0], body: [0, 0, 0] },
    { tick: 8, arm_r: [-40, 0, 50], arm_l: [-40, 0, -50], body: [-8, 0, 0], head: [-15, 0, 0] },
    { tick: 14, arm_r: [-40, 0, 50], arm_l: [-40, 0, -50], body: [-8, 0, 0], head: [-15, 0, 0] },
    { tick: 16, arm_r: [-90, 0, 0], arm_l: [0, 0, 0], body: [0, -40, 0], head: [0, 0, 0] },
    { tick: 23, arm_r: [-90, 0, 0], body: [0, 180, 0] },
    { tick: 29, arm_r: [-175, 0, 0], body: [-10, 360, 0] },
    { tick: 33, arm_r: [-30, 0, 0], body: [22, 360, 0] },
    { tick: 46, arm_r: [-20, 0, 0], body: [10, 360, 0] },
    { tick: 58, arm_r: [0, 0, 0], body: [0, 360, 0] },
  ];
  return { timeline: { name: '군주의 만찬 — 사방의 땅에서 핏줄기를 빨아들여 피의 리본으로 몸을 휘감은 뒤, 앞으로 X자 대참격을 날려 핏방울과 박쥐 떼를 터뜨린다', duration_ticks: 60, tracks: T, player }, frames: F };
}
