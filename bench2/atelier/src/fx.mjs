// 피의 군주 이펙트: 기본 공격 3연타 + 스킬 "혈월 강림"
// 브리프 timeline.json 형식. 좌표는 블록, 플레이어는 -Z를 본다. 흑백 프레임 + tint(서버의 custom_model_data colors와 같은 곱연산)
import * as V from '../../../atelier/mc/vfx.js';

const seq = (name, list, frames) => { list.forEach((c, i) => (frames[`${name}_${i}.png`] = c)); return list.map((_, i) => `${name}_${i}.png`); };

export function basic_attack() {
  const F = {};
  const s1 = seq('hit1', V.bloodSlash({ size: 32, frames: 6, start: -20, sweep: -200, seed: 1 }), F);   // 오른쪽 → 왼쪽
  const s2 = seq('hit2', V.bloodSlash({ size: 32, frames: 5, start: 160, sweep: -190, width: 0.15, seed: 2 }), F);
  const s3 = seq('hit3', V.bloodSlash({ size: 64, frames: 7, start: -100, sweep: 190, width: 0.2, seed: 3, drops: 10 }), F);
  const sp = seq('splat', V.bloodSplatter({ size: 32, frames: 6, seed: 5 }), F);
  const ring = seq('ring', V.shockRing({ size: 32, frames: 6, width: 0.16 }), F);
  const spike = seq('spike', V.bloodSpike({ w: 16, h: 32, frames: 6 }), F);
  const T = [
    // 1타: 수평 베기 — 가슴 높이, 약간 앞으로 기울인 평면
    { id: 'hit1_slash', frames: s1, ticks_per_frame: 1, start_tick: 2, end_tick: 8, size: [3.4, 3.4], tint: '#c41e2c', keys: [{ tick: 2, translation: [0, 1.25, -0.9], rotation: [-38, 0, 0], scale: [1.1, 1.1, 1] }, { tick: 8, scale: [1.3, 1.3, 1] }] }, // v3: -72°/-58°는 3인칭 시점에서 선처럼 보임 → -38°
    { id: 'hit1_splat', frames: sp, ticks_per_frame: 1, start_tick: 5, end_tick: 10, size: [1.3, 1.3], billboard: 'center', tint: '#a8162a', keys: [{ tick: 5, translation: [-0.4, 1.35, -1.9], scale: [1, 1, 1] }] },
    // 2타: 역사선 올려베기 — 앞을 보는 평면을 35° 기울임, 더 빠르고 밝게
    { id: 'hit2_slash', frames: s2, ticks_per_frame: 1, start_tick: 11, end_tick: 16, size: [3.2, 3.2], tint: '#ff4a52', keys: [{ tick: 11, translation: [0.1, 1.4, -1.3], rotation: [0, 0, -35], scale: [1, 1, 1] }, { tick: 16, rotation: [0, 0, -45], scale: [1.1, 1.1, 1] }] },
    { id: 'hit2_splat', frames: sp, ticks_per_frame: 1, start_tick: 13, end_tick: 18, size: [1.1, 1.1], billboard: 'center', tint: '#d22b38', keys: [{ tick: 13, translation: [0.5, 1.8, -1.9], scale: [1, 1, 1] }] },
    // 3타: 내려찍기 — 옆에서 본 세로 평면(YZ), 크게. 착지 순간 충격파·혈창·비산
    { id: 'hit3_slash', frames: s3, ticks_per_frame: 1, start_tick: 22, end_tick: 29, size: [4.6, 4.6], tint: '#8c1626', keys: [{ tick: 22, translation: [0, 1.6, -1.4], rotation: [0, 90, 0], scale: [1, 1, 1] }] },
    { id: 'hit3_core', frames: s3, ticks_per_frame: 1, start_tick: 22, end_tick: 29, size: [4.2, 4.2], tint: '#ff8a7a', keys: [{ tick: 22, translation: [0.02, 1.6, -1.4], rotation: [0, 90, 0], scale: [0.92, 0.92, 1] }] },
    { id: 'hit3_ring', frames: ring, ticks_per_frame: 2, start_tick: 27, end_tick: 38, size: [4, 4], tint: '#b0202e', keys: [{ tick: 27, translation: [0, 0.06, -2.6], rotation: [-90, 0, 0], scale: [0.5, 0.5, 1] }, { tick: 38, scale: [1.5, 1.5, 1] }] },
    ...[[-0.9, -2.5, 27], [0, -3.3, 28], [0.9, -2.5, 29]].map(([x, z, t], i) => ({ id: `hit3_spike${i}`, frames: spike, ticks_per_frame: 2, start_tick: t, end_tick: t + 11, size: [0.9, 1.8], billboard: 'vertical', tint: '#a8162a', keys: [{ tick: t, translation: [x, 0.9, z], scale: [1, 1, 1] }] })),
    { id: 'hit3_splat', frames: sp, ticks_per_frame: 2, start_tick: 27, end_tick: 38, size: [2.4, 2.4], billboard: 'center', tint: '#8c1626', keys: [{ tick: 27, translation: [0, 0.9, -2.6], scale: [1, 1, 1] }] },
  ];
  const player = [
    { tick: 0, arm_r: [-70, 70, 0], body: [0, -35, 0] },          // 1타 준비(오른쪽으로 감음)
    { tick: 5, arm_r: [-80, -60, 0], body: [0, 35, 0] },          // 1타 휘두름(왼쪽)
    { tick: 10, arm_r: [-20, -40, 0], body: [0, 20, 0] },          // 2타 준비(왼쪽 아래)
    { tick: 14, arm_r: [-165, 40, 0], body: [0, -25, 0] },         // 2타 올려베기
    { tick: 21, arm_r: [-175, 0, 0], body: [-12, 0, 0] },          // 3타 머리 위로
    { tick: 26, arm_r: [-35, 0, 0], body: [22, 0, 0] },            // 3타 내려찍기(몸 숙임)
    { tick: 36, arm_r: [-30, 0, 0], body: [12, 0, 0] },
    { tick: 44, arm_r: [0, 0, 0], body: [0, 0, 0] },
  ];
  return { timeline: { name: '기본 공격 3연타 — 1타 수평 베기 · 2타 역사선 올려베기 · 3타 내려찍기(충격파+혈창)', duration_ticks: 46, tracks: T, player }, frames: F };
}

export function skill() {
  const F = {};
  const vortex = seq('vortex', V.bloodVortex({ size: 64, frames: 8 }), F);
  const moon = seq('moon', V.magicCircle({ size: 64, folds: 5, frames: 4, seed: 9 }), F);
  const spin = seq('spin', V.bloodSlash({ size: 64, frames: 8, start: -90, sweep: 360, width: 0.14, seed: 7, drops: 12 }), F);
  const spike = seq('spike', V.bloodSpike({ w: 16, h: 32, frames: 6 }), F);
  const ring = seq('ring', V.shockRing({ size: 64, frames: 8, width: 0.08 }), F);
  const sp = seq('splat', V.bloodSplatter({ size: 32, frames: 6, seed: 8, count: 18 }), F);
  const T = [
    { id: 'vortex', frames: vortex, ticks_per_frame: 2, start_tick: 0, end_tick: 50, size: [4.5, 4.5], tint: '#8c1626', keys: [{ tick: 0, translation: [0, 0.04, 0], rotation: [-90, 0, 0], scale: [0.3, 0.3, 1] }, { tick: 14, scale: [1.2, 1.2, 1] }, { tick: 50, scale: [1.4, 1.4, 1] }] },
    { id: 'moon', frames: moon, ticks_per_frame: 3, start_tick: 4, end_tick: 52, size: [3.4, 3.4], tint: '#d22b38', keys: [{ tick: 4, translation: [0, 2.2, 1.3], rotation: [0, 0, 0], scale: [0.2, 0.2, 1] }, { tick: 14, translation: [0, 3.3, 1.3], scale: [1, 1, 1] }, { tick: 52, rotation: [0, 0, 60] }] },
    { id: 'spin', frames: spin, ticks_per_frame: 1, start_tick: 16, end_tick: 24, size: [6.5, 6.5], tint: '#ff4a52', keys: [{ tick: 16, translation: [0, 1.1, 0], rotation: [-90, 0, 0], scale: [1, 1, 1] }, { tick: 24, scale: [1.2, 1.2, 1] }] },
    ...Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2, t = 22 + i * 2;
      return { id: `spike${i}`, frames: spike, ticks_per_frame: 2, start_tick: t, end_tick: t + 12, size: [1, 2.2], billboard: 'vertical', tint: '#a8162a', keys: [{ tick: t, translation: [Math.cos(a) * 2.6, 1.1, Math.sin(a) * 2.6], scale: [1, 1, 1] }] };
    }),
    { id: 'ring', frames: ring, ticks_per_frame: 2, start_tick: 24, end_tick: 40, size: [7, 7], tint: '#b0202e', keys: [{ tick: 24, translation: [0, 0.06, 0], rotation: [-90, 0, 0], scale: [0.4, 0.4, 1] }, { tick: 40, scale: [1.3, 1.3, 1] }] },
    ...[[1.8, 1.2, -1.5, 30], [-1.6, 1.0, -1.8, 32], [0.4, 1.4, 2.0, 34]].map(([x, y, z, t], i) => ({ id: `splat${i}`, frames: sp, ticks_per_frame: 2, start_tick: t, end_tick: t + 11, size: [1.6, 1.6], billboard: 'center', tint: '#8c1626', keys: [{ tick: t, translation: [x, y, z], scale: [1, 1, 1] }] })),
  ];
  const player = [
    { tick: 0, arm_r: [0, 0, 0], body: [0, 0, 0] },
    { tick: 10, arm_r: [-175, 0, 0], arm_l: [-160, 0, 0], body: [-10, 0, 0], head: [-20, 0, 0] },  // 낫을 하늘로
    { tick: 16, arm_r: [-90, 0, 0], arm_l: [0, 0, 0], body: [0, 0, 0], head: [0, 0, 0] },
    { tick: 20, arm_r: [-90, 0, 0], body: [0, 180, 0] },                                               // 회전베기
    { tick: 24, arm_r: [-90, 0, 0], body: [0, 359, 0] },
    { tick: 30, arm_r: [-40, 0, 0], body: [15, 0, 0] },
    { tick: 52, arm_r: [0, 0, 0], body: [0, 0, 0] },
  ];
  return { timeline: { name: '혈월 강림 — 발밑에 피의 소용돌이, 등 뒤에 핏빛 달이 떠오른 뒤 360° 회전베기와 함께 혈창 6개가 원형으로 솟고 충격파가 퍼진다', duration_ticks: 56, tracks: T, player }, frames: F };
}
