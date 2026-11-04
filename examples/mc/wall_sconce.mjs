// 방향 블록(variants): 벽걸이 촛대. 기본 모델은 북쪽 벽(z=0)에 붙어 있고, facing에 따라 y 회전.
// 마인크래프트 감각: 얇은 장식은 교차 평면, 불꽃은 light 15 + 음영 없음, 회전은 블록스테이트에서(uvlock 불필요)
import { PixelCanvas } from '../../atelier/pixel.js';

const flame = () => ({
  // v2: 초(3) 대비 불꽃(5)이 너무 커서 횃불처럼 보임 → 3×4, 끝을 뾰족하게, 심지 쪽은 주황
  paint: (w, h) => new PixelCanvas(w, h).chars(0, 0, [
    '.y.',
    'yWy',
    'yWy',
    '.o.',
  ], { y: '#ffcf5a', W: '#fff6d8', o: '#ff8a2a' }),
});

export default {
  name: 'wall_sconce',
  type: 'block',
  materials: {
    iron: { mat: 'metal', base: '#4d5462', rivets: false },
    brass: { mat: 'metal', base: '#b98a3e', rivets: false },
    wax: { mat: 'skin', base: '#efe4cf' },
  },
  parts: {
    sconce: [
      { name: 'plate', from: [6, 4, 0], to: [10, 12, 1], material: 'iron' },
      { name: 'arm', from: [7, 6, 1], to: [9, 7, 5], material: 'iron' },
      { name: 'cup', from: [6, 7, 3], to: [10, 8, 7], material: 'brass' },
      { name: 'candle', from: [7, 8, 4], to: [9, 11, 6], material: 'wax' },
      { name: 'flame_a', from: [8, 11, 3.5], to: [8, 15, 6.5], material: flame(), light: 15, rotation: { axis: 'y', angle: 45, origin: [8, 11, 5] } },
      { name: 'flame_b', from: [8, 11, 3.5], to: [8, 15, 6.5], material: flame(), light: 15, rotation: { axis: 'y', angle: -45, origin: [8, 11, 5] } },
    ],
  },
  blockstate: {
    variants: {
      'facing=north': { model: 'sconce' },
      'facing=east': { model: 'sconce', y: 90 },
      'facing=south': { model: 'sconce', y: 180 },
      'facing=west': { model: 'sconce', y: 270 },
    },
  },
};
