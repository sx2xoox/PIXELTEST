// 연결 블록(multipart): 정원 울타리. 기둥(post)은 항상, 가로대(side)는 연결된 방향마다 y 회전으로 붙는다.
// side 모델은 "북쪽으로 뻗은" 한 방향만 만들고 east=90, south=180, west=270으로 재사용(uvlock으로 결 방향 유지).
export default {
  name: 'garden_fence',
  type: 'block',
  materials: {
    post: { mat: 'log', bark: '#6a5038', inner: '#c49d66' },
    rail: { mat: 'wood', base: '#a98557' }, // v2: 2px 가로대에 판자 재질(이음매·못)은 점처럼 지저분 → 결만 있는 wood
    moss: { mat: 'moss', base: '#5d8f3a' },
  },
  parts: {
    post: [
      { name: 'post', from: [6, 0, 6], to: [10, 15, 10], material: 'post' },
      { name: 'cap', from: [5, 15, 5], to: [11, 16, 11], material: 'moss' },
    ],
    side: [
      { name: 'rail_low', from: [7, 5, 0], to: [9, 7, 6], material: 'rail' },
      { name: 'rail_high', from: [7, 11, 0], to: [9, 13, 6], material: 'rail' },
    ],
  },
  blockstate: {
    multipart: [
      { apply: { model: 'post' } },
      { when: { north: 'true' }, apply: { model: 'side', uvlock: true } },
      { when: { east: 'true' }, apply: { model: 'side', y: 90, uvlock: true } },
      { when: { south: 'true' }, apply: { model: 'side', y: 180, uvlock: true } },
      { when: { west: 'true' }, apply: { model: 'side', y: 270, uvlock: true } },
    ],
  },
};
