// 기존 Claude 방식: 큐브 좌표와 단색 면을 한 번에 작성(미리보기·텍스처 페인팅 없음)
export default {
  name: 'baseline_mushroom_spirit',
  type: 'entity',
  materials: {
    cap: { mat: 'solid', color: '#c0392b' },
    stem: { mat: 'solid', color: '#f5e6c8' },
    dot: { mat: 'solid', color: '#ffffff' },
    eye: { mat: 'solid', color: '#222222' },
  },
  bones: [
    { name: 'root', pivot: [0, 0, 0] },
    { name: 'body', pivot: [0, 4, 0], parent: 'root' },
    { name: 'cap', pivot: [0, 10, 0], parent: 'body' },
    { name: 'leg_r', pivot: [1.5, 4, 0], parent: 'root' },
    { name: 'leg_l', pivot: [-1.5, 4, 0], parent: 'root' },
  ],
  cubes: [
    { name: 'stem', bone: 'body', from: [-3, 4, -3], to: [3, 10, 3], material: 'stem' },
    { name: 'cap', bone: 'cap', from: [-6, 10, -6], to: [6, 14, 6], material: 'cap' },
    { name: 'dot1', bone: 'cap', from: [-4, 14, -2], to: [-2, 14.5, 0], material: 'dot' },
    { name: 'dot2', bone: 'cap', from: [2, 14, 1], to: [4, 14.5, 3], material: 'dot' },
    { name: 'eye_r', bone: 'body', from: [1, 7, -3.1], to: [2, 8, -3], material: 'eye' },
    { name: 'eye_l', bone: 'body', from: [-2, 7, -3.1], to: [-1, 8, -3], material: 'eye' },
    { name: 'leg_r', bone: 'leg_r', from: [0.5, 0, -1], to: [2.5, 4, 1], material: 'stem' },
    { name: 'leg_l', bone: 'leg_l', from: [-2.5, 0, -1], to: [-0.5, 4, 1], material: 'stem' },
  ],
  animations: {
    walk: { length: 1, loop: true, bones: {
      leg_r: { rotation: { 0: [30, 0, 0], 0.5: [-30, 0, 0], 1: [30, 0, 0] } },
      leg_l: { rotation: { 0: [-30, 0, 0], 0.5: [30, 0, 0], 1: [-30, 0, 0] } },
      cap: { rotation: { 0: [0, 0, 5], 0.5: [0, 0, -5], 1: [0, 0, 5] } },
    } },
  },
};
