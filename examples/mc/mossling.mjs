// 엔티티 모델(독자 디자인): 머리 큰 2등신 이끼 돌정령. 귀여움 = 큰 머리, 짧은 다리, 낮은 눈 위치.
// bone 피벗은 관절 위치(어깨, 엉덩이, 목)에 둔다 → 회전이 자연스럽다.
// 좌우: 엔티티는 북쪽(-z)을 바라보므로 몹의 오른쪽(_r)이 +x, 왼쪽(_l)이 -x.
import { PixelCanvas } from '../../atelier/pixel.js';

const sprout = () => ({
  paint: (w, h) => new PixelCanvas(w, h).chars(0, 0, [
    '.lL.',
    'lLl.',
    '.Ls.',
    '..s.',
  ], { l: '#5fae3e', L: '#8fd45a', s: '#3d6b2a' }),
});

export default {
  name: 'mossling',
  type: 'entity',
  materials: {
    // v2: 캐릭터 크기에서는 돌 노이즈 대비를 낮춘다(contrast 0.9, 균열 없음). 머리(밝음)·몸(중간)·팔다리(어둠)로 명도 3단 분리
    rock: { mat: 'stone', base: '#9aa1ab', contrast: 0.9, cracks: false },
    moss: { mat: 'moss', base: '#5d8f3a' },
    body: { mat: 'stone', base: '#78808b', contrast: 0.9, cracks: false },
    rockDark: { mat: 'stone', base: '#555c67', contrast: 0.8, cracks: false },
  },
  bones: [
    { name: 'root', pivot: [0, 0, 0] },
    { name: 'body', pivot: [0, 6, 0], parent: 'root' },
    { name: 'head', pivot: [0, 12, 0], parent: 'body' },
    { name: 'arm_r', pivot: [5, 11, 0], parent: 'body' },
    { name: 'arm_l', pivot: [-5, 11, 0], parent: 'body' },
    { name: 'leg_r', pivot: [2.5, 6, 0], parent: 'root' },
    { name: 'leg_l', pivot: [-2.5, 6, 0], parent: 'root' },
  ],
  cubes: [
    { name: 'torso', bone: 'body', from: [-4, 6, -3], to: [4, 12, 3], material: 'body',
      faces: { up: { material: 'moss' }, north: { chars: { x: 2, y: 1, rows: ['.mm.', 'mMMm', '.mm.'], legend: { m: '#4f7d33', M: '#6fa847' } } } } },
    // v3: 실루엣 검사 → 머리=몸 폭이면 네모난 병처럼 보임. 머리를 10칸으로 넓혀 2등신 귀여움 강조
    { name: 'skull', bone: 'head', from: [-5, 12, -4], to: [5, 19, 4], material: 'rock',
      faces: {
        north: { chars: { x: 1, y: 2, rows: [
          '.eE..Ee.',
          '.EE..EE.',
          'b......b',
          '...mm...',
        ], legend: { e: '#e6fff6', E: '#3fd0a8', m: '#2e3238', b: '#b58f96' } } },
        up: { material: 'moss' },
      } },
    { name: 'moss_cap', bone: 'head', from: [-5, 19, -4], to: [5, 20, 4], material: 'moss', inflate: 0.25 },
    { name: 'sprout_a', bone: 'head', from: [0, 20, -2], to: [0, 24, 2], material: sprout(), rotation: [0, 45, 0], pivot: [0, 20, 0] },
    { name: 'sprout_b', bone: 'head', from: [0, 20, -2], to: [0, 24, 2], material: sprout(), rotation: [0, -45, 0], pivot: [0, 20, 0] },
    { name: 'arm_r', bone: 'arm_r', from: [4, 4, -1], to: [6, 11, 1], material: 'rockDark' },
    { name: 'arm_l', bone: 'arm_l', from: [-6, 4, -1], to: [-4, 11, 1], material: 'rockDark' },
    { name: 'leg_r', bone: 'leg_r', from: [1, 0, -2], to: [4, 6, 1], material: 'rockDark' },
    { name: 'leg_l', bone: 'leg_l', from: [-4, 0, -2], to: [-1, 6, 1], material: 'rockDark' },
  ],
  animations: {
    walk: {
      length: 1, loop: true,
      bones: {
        leg_r: { rotation: { 0: [25, 0, 0], 0.5: [-25, 0, 0], 1: [25, 0, 0] } },
        leg_l: { rotation: { 0: [-25, 0, 0], 0.5: [25, 0, 0], 1: [-25, 0, 0] } },
        arm_r: { rotation: { 0: [-20, 0, 0], 0.5: [20, 0, 0], 1: [-20, 0, 0] } },
        arm_l: { rotation: { 0: [20, 0, 0], 0.5: [-20, 0, 0], 1: [20, 0, 0] } },
        body: { position: { 0: [0, 0, 0], 0.25: [0, 0.5, 0], 0.5: [0, 0, 0], 0.75: [0, 0.5, 0], 1: [0, 0, 0] } },
        head: { rotation: { 0: [0, 0, 3], 0.5: [0, 0, -3], 1: [0, 0, 3] } },
      },
    },
  },
};
