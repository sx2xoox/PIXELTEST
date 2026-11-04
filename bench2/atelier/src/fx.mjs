// 피의 군주 이펙트 v2: 기본 공격 3연타 + 스킬 "혈월 강림"
// v1 평가: 스킬이 정적이고 끝이 뚝 끊김, 원뿔 가시, 2타 연어색 → v2 원칙
//  ① 연출 곡선: 예비(빨아들임) → 축적(달·웅덩이) → 절정(섬광·회전베기) → 여파(가시·충격파) → 소멸(디더)
//  ② 흰빛 심이 필요한 스프라이트는 피 램프로 직접 칠함(틴트 곱연산은 하이라이트를 못 냄)
//  ③ 모든 요소는 끝에 디더 소멸 프레임을 붙인다
import * as V from '../../../atelier/mc/vfx.js';

const reg = (F, name, list) => { list.forEach((c, i) => (F[`${name}_${i}.png`] = c)); return list.map((_, i) => `${name}_${i}.png`); };
const hold = (list, n) => [...list, ...Array(n).fill(list[list.length - 1])];
const loop = (list, n) => Array.from({ length: n }, (_, i) => list[i % list.length]);
const withFade = (F, name, frames, n = 4) => [...reg(F, name, frames), ...reg(F, name + '_fade', V.dissolve(frames[frames.length - 1].clone(), n))];

export function basic_attack() {
  const F = {};
  const s1 = withFade(F, 'hit1', V.bloodSlash({ size: 32, frames: 6, start: -20, sweep: -200, seed: 1 }), 2);
  const s2 = withFade(F, 'hit2', V.bloodSlash({ size: 32, frames: 5, start: 160, sweep: -190, width: 0.17, seed: 2 }), 2);
  const s3 = withFade(F, 'hit3', V.bloodSlash({ size: 64, frames: 7, start: -100, sweep: 190, width: 0.2, seed: 3, drops: 10 }), 3);
  const sp = withFade(F, 'splat', V.bloodSplatter({ size: 32, frames: 6, seed: 5 }), 2);
  const ring = withFade(F, 'ring', V.shockRing({ size: 32, frames: 6, width: 0.16 }), 2);
  const spikes = withFade(F, 'spike', V.spikeCluster({ w: 32, h: 48, frames: 8 }), 3);
  const pool = reg(F, 'pool', [...hold(V.bloodPool({ size: 32, frames: 4, seed: 9 }), 5)]);
  const poolFade = reg(F, 'pool_fade', V.dissolve(V.bloodPool({ size: 32, frames: 4, seed: 9 })[3], 4));
  const T = [
    // 1타: 수평 베기(어두운 진홍) — 3인칭에서 보이도록 앞으로 세운 평면
    { id: 'hit1_slash', frames: s1, ticks_per_frame: 1, start_tick: 2, end_tick: 10, size: [3.4, 3.4], tint: '#c41e2c', keys: [{ tick: 2, translation: [0, 1.25, -0.9], rotation: [-38, 0, 0], scale: [1.1, 1.1, 1] }, { tick: 8, scale: [1.3, 1.3, 1] }] },
    { id: 'hit1_splat', frames: sp, ticks_per_frame: 1, start_tick: 5, end_tick: 13, size: [1.3, 1.3], billboard: 'center', tint: '#a8162a', keys: [{ tick: 5, translation: [-0.4, 1.35, -1.9], scale: [1, 1, 1] }] },
    // 2타: 역사선 올려베기(밝은 진홍, v2: 연어색 제거) — 더 빠르고 크게
    { id: 'hit2_slash', frames: s2, ticks_per_frame: 1, start_tick: 11, end_tick: 18, size: [3.6, 3.6], tint: '#e0283a', keys: [{ tick: 11, translation: [0.1, 1.4, -1.3], rotation: [0, 0, -35], scale: [1, 1, 1] }, { tick: 16, rotation: [0, 0, -45], scale: [1.15, 1.15, 1] }] },
    { id: 'hit2_splat', frames: sp, ticks_per_frame: 1, start_tick: 13, end_tick: 21, size: [1.1, 1.1], billboard: 'center', tint: '#c41e2c', keys: [{ tick: 13, translation: [0.5, 1.8, -1.9], scale: [1, 1, 1] }] },
    // 3타: 내려찍기 — 세로 궤적 → 착지: 충격파 + 결정 가시 다발(v2) + 피웅덩이 여운(v2)
    { id: 'hit3_slash', frames: s3, ticks_per_frame: 1, start_tick: 22, end_tick: 32, size: [4.6, 4.6], tint: '#8c1626', keys: [{ tick: 22, translation: [0, 1.6, -1.4], rotation: [0, 90, 0], scale: [1, 1, 1] }] },
    { id: 'hit3_core', frames: s3, ticks_per_frame: 1, start_tick: 22, end_tick: 32, size: [4.2, 4.2], tint: '#e0283a', keys: [{ tick: 22, translation: [0.02, 1.6, -1.4], rotation: [0, 90, 0], scale: [0.92, 0.92, 1] }] },
    { id: 'hit3_pool', frames: [...pool, ...poolFade], ticks_per_frame: 2, start_tick: 27, end_tick: 52, size: [2.6, 2.6], keys: [{ tick: 27, translation: [0, 0.03, -2.6], rotation: [-90, 0, 20], scale: [1, 1, 1] }] },
    { id: 'hit3_ring', frames: ring, ticks_per_frame: 2, start_tick: 27, end_tick: 42, size: [4, 4], tint: '#b0202e', keys: [{ tick: 27, translation: [0, 0.06, -2.6], rotation: [-90, 0, 0], scale: [0.5, 0.5, 1] }, { tick: 42, scale: [1.6, 1.6, 1] }] },
    { id: 'hit3_spikes', frames: spikes, ticks_per_frame: 2, start_tick: 27, end_tick: 49, size: [2.6, 3.9], billboard: 'vertical', keys: [{ tick: 27, translation: [0, 1.95, -2.7], scale: [1, 1, 1] }] },
    { id: 'hit3_splat', frames: sp, ticks_per_frame: 2, start_tick: 27, end_tick: 43, size: [2.4, 2.4], billboard: 'center', tint: '#8c1626', keys: [{ tick: 27, translation: [0, 0.9, -2.6], scale: [1, 1, 1] }] },
  ];
  const player = [
    { tick: 0, arm_r: [-70, 70, 0], body: [0, -35, 0] },
    { tick: 5, arm_r: [-80, -60, 0], body: [0, 35, 0] },
    { tick: 10, arm_r: [-20, -40, 0], body: [0, 20, 0] },
    { tick: 14, arm_r: [-165, 40, 0], body: [0, -25, 0] },
    { tick: 21, arm_r: [-175, 0, 0], body: [-12, 0, 0] },
    { tick: 26, arm_r: [-35, 0, 0], body: [22, 0, 0] },
    { tick: 36, arm_r: [-30, 0, 0], body: [12, 0, 0] },
    { tick: 48, arm_r: [0, 0, 0], body: [0, 0, 0] },
  ];
  return { timeline: { name: '기본 공격 3연타 — 1타 수평 베기 · 2타 역사선 올려베기 · 3타 내려찍기(충격파 + 결정 가시 다발 + 피웅덩이)', duration_ticks: 54, tracks: T, player }, frames: F };
}

export function skill() {
  const F = {};
  const drop = reg(F, 'drop', [V.bloodDrop(8)]);
  const moonLoop = V.bloodMoon({ size: 64, frames: 4 });
  const moon = [...reg(F, 'moon', moonLoop)];
  const moonSeq = [...loop(moon, 20), ...reg(F, 'moon_fade', V.dissolve(moonLoop[0].clone(), 4))];
  const halo = withFade(F, 'halo', V.magicCircle({ size: 64, folds: 7, frames: 1, seed: 9 }), 4);
  const haloSeq = [...Array(18).fill(halo[0]), ...halo.slice(1)];
  const poolG = V.bloodPool({ size: 64, frames: 6, seed: 6 });
  const poolSeq = [...reg(F, 'pool', hold(poolG, 14)), ...reg(F, 'pool_fade', V.dissolve(poolG[5].clone(), 4))];
  const flash = reg(F, 'flash', V.flashBurst({ size: 32, frames: 3 }));
  const blade = V.crescentBlade({ size: 64, span: 170, width: 0.17 });
  const bladeDark = V.crescentBlade({ size: 64, span: 200, width: 0.22, ramp: ['#1e0509', '#3a0a12', '#5a0d1a', '#7a1220', '#8c1626'] });
  const bladeSeq = [...reg(F, 'blade', Array(8).fill(blade)), ...reg(F, 'blade_fade', V.dissolve(blade.clone(), 3))];
  const bladeDarkSeq = [...reg(F, 'bladeD', Array(8).fill(bladeDark)), ...reg(F, 'bladeD_fade', V.dissolve(bladeDark.clone(), 3))];
  const ring = withFade(F, 'ring', V.shockRing({ size: 64, frames: 7, width: 0.07, from: 0.15, to: 0.48 }).map(c => c), 3);
  const spikes = withFade(F, 'spikes', V.spikeCluster({ w: 32, h: 48, frames: 9 }), 3);
  const splat = withFade(F, 'splat', V.bloodSplatter({ size: 32, frames: 6, seed: 8, count: 18 }), 2);
  const tip = [0, 4.1, -0.2];                                     // 낫을 머리 위로 든 순간의 끝 근처
  const T = [];
  // ① 예비(0~16): 땅에서 핏방울 8개가 낫 끝으로 빨려 올라감
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, t0 = i;
    T.push({ id: `rise${i}`, frames: drop, start_tick: t0, end_tick: t0 + 10, size: [0.35, 0.35], billboard: 'center', keys: [{ tick: t0, translation: [Math.cos(a) * 2.4, 0.2, Math.sin(a) * 2.4], scale: [1, 1, 1] }, { tick: t0 + 10, translation: tip, scale: [0.4, 0.4, 1] }] });
  }
  // ② 축적: 피 웅덩이(4~)·핏빛 달과 후광(6~)
  T.push({ id: 'pool', frames: poolSeq, ticks_per_frame: 2, start_tick: 4, end_tick: 4 + poolSeq.length * 2 - 1, size: [4.4, 4.4], keys: [{ tick: 4, translation: [0, 0.03, 0], rotation: [-90, 0, 0], scale: [1, 1, 1] }, { tick: 50, rotation: [-90, 0, 40] }] });
  T.push({ id: 'halo', frames: haloSeq, ticks_per_frame: 2, start_tick: 8, end_tick: 8 + haloSeq.length * 2 - 1, size: [4.0, 4.0], tint: '#a8162a', keys: [{ tick: 8, translation: [0, 3.9, 1.9], rotation: [0, 0, 0], scale: [0.3, 0.3, 1] }, { tick: 18, scale: [1, 1, 1] }, { tick: 50, rotation: [0, 0, -90] }] });
  T.push({ id: 'moon', frames: moonSeq, ticks_per_frame: 2, start_tick: 6, end_tick: 6 + moonSeq.length * 2 - 1, size: [3.2, 3.2], keys: [{ tick: 6, translation: [0, 2.4, 1.6], scale: [0.25, 0.25, 1] }, { tick: 18, translation: [0, 3.9, 1.6], scale: [1, 1, 1] }, { tick: 26, scale: [1.12, 1.12, 1] }, { tick: 34, scale: [1, 1, 1] }] });
  // ③ 절정(18~32): 낫 끝 섬광 → 2겹 초승달이 몸을 1.25바퀴 휘감는 회전베기
  T.push({ id: 'flash', frames: flash, ticks_per_frame: 1, start_tick: 18, end_tick: 20, size: [2.2, 2.2], billboard: 'center', keys: [{ tick: 18, translation: tip, scale: [1, 1, 1] }] });
  T.push({ id: 'spin_dark', frames: bladeDarkSeq, ticks_per_frame: 1, start_tick: 21, end_tick: 31, size: [7.4, 7.4], keys: [{ tick: 21, translation: [0, 1.05, 0], rotation: [-90, 0, 30], scale: [1, 1, 1] }, { tick: 31, rotation: [-90, 0, -420] }] });
  T.push({ id: 'spin', frames: bladeSeq, ticks_per_frame: 1, start_tick: 21, end_tick: 31, size: [6.8, 6.8], keys: [{ tick: 21, translation: [0, 1.15, 0], rotation: [-90, 0, 0], scale: [1, 1, 1] }, { tick: 31, rotation: [-90, 0, -450] }] });
  // ④ 여파(24~): 충격파 + 결정 가시 다발 6개 순차 + 비산
  T.push({ id: 'ring', frames: ring, ticks_per_frame: 2, start_tick: 24, end_tick: 24 + ring.length * 2 - 1, size: [8, 8], tint: '#c41e2c', keys: [{ tick: 24, translation: [0, 0.07, 0], rotation: [-90, 0, 0], scale: [0.5, 0.5, 1] }, { tick: 44, scale: [1.3, 1.3, 1] }] });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3, t = 25 + i * 2, x = Math.cos(a) * 2.7, z = Math.sin(a) * 2.7;
    T.push({ id: `spikes${i}`, frames: spikes, ticks_per_frame: 2, start_tick: t, end_tick: t + spikes.length * 2 - 1, size: [1.9, 2.85], billboard: 'vertical', keys: [{ tick: t, translation: [x, 1.42, z], scale: [1, 1, 1] }] });
    if (i % 2 === 0) T.push({ id: `splat${i}`, frames: splat, ticks_per_frame: 2, start_tick: t + 1, end_tick: t + splat.length * 2, size: [1.5, 1.5], billboard: 'center', keys: [{ tick: t + 1, translation: [x * 0.9, 0.7, z * 0.9], scale: [1, 1, 1] }] });
  }
  // ⑤ 소멸(40~): 달에서 떨어지는 핏방울
  for (let i = 0; i < 5; i++) {
    const t0 = 40 + i * 2, x = (i - 2) * 0.6;
    T.push({ id: `fall${i}`, frames: drop, start_tick: t0, end_tick: t0 + 9, size: [0.3, 0.3], billboard: 'center', keys: [{ tick: t0, translation: [x, 3.3, 1.4], scale: [1, 1, 1] }, { tick: t0 + 9, translation: [x * 1.1, 0.1, 1.2], scale: [0.7, 0.7, 1] }] });
  }
  const player = [
    { tick: 0, arm_r: [0, 0, 0], body: [0, 0, 0] },
    { tick: 9, arm_r: [-175, 0, 0], arm_l: [-165, 0, 0], body: [-10, 0, 0], head: [-25, 0, 0] },   // 낫을 하늘로(핏방울을 모음)
    { tick: 18, arm_r: [-178, 0, 0], arm_l: [-170, 0, 0], body: [-12, 0, 0], head: [-25, 0, 0] },
    { tick: 21, arm_r: [-90, 0, 0], arm_l: [0, 0, 0], body: [0, -40, 0], head: [0, 0, 0] },        // 감아 치기
    { tick: 26, arm_r: [-90, 0, 0], body: [0, 180, 0] },
    { tick: 31, arm_r: [-90, 0, 0], body: [0, 410, 0] },                                            // 1.25바퀴
    { tick: 34, arm_r: [-40, 0, 0], body: [18, 360, 0] },
    { tick: 52, arm_r: [0, 0, 0], body: [0, 360, 0] },
  ];
  return { timeline: { name: '혈월 강림 — 땅의 피를 낫 끝으로 모아 등 뒤에 핏빛 달을 띄우고, 섬광과 함께 1.25바퀴 회전베기로 주변을 가른 뒤 결정 가시 다발 6개가 원형으로 솟는다', duration_ticks: 60, tracks: T, player }, frames: F };
}
