// 피의 낫 "혈월낫" — 3D 무기 (브리프 규약: 쥐는 점 = 원점, 자루 +Y, 날은 위 끝에서 -Z로 휨)
// ModelEngine 규칙: 큐브 회전 없이 '본 사슬' 회전으로 곡선 날을 만든다(본 회전은 자유)
import { PixelCanvas } from '../../../atelier/pixel.js';
import { iron, bone, glow, bladeFace, BLOOD, IRON, BONE } from './palette.mjs';

const P = f => ({ paint: f });
const handle = P((w, h, face) => {
  const c = iron(w, h, face, { rivets: false, seed: 4 });
  if (face === 'up' || face === 'down') return c;
  // 뼈 손잡이 감개(쥐는 부분: 원점 근처 = 텍스처 아래쪽에서 6~14), 위쪽에 피 홈
  for (let y = 0; y < h; y++) { const fromBottom = h - 1 - y; if (fromBottom >= 4 && fromBottom <= 13 && fromBottom % 2 === 0) c.hline(0, w - 1, y, BONE[fromBottom % 4 === 0 ? 2 : 1]); }
  for (let y = 2; y < h - 18; y += 5) c.set(0, y, BLOOD[2]);
  return c;
});
// v2: 날이 가늘고 짧아 갈고리처럼 보였음 → 더 넓고(8→2) 길게(총 33), 날 등에 뼈 가시로 위협적인 실루엣
const SEG = [[8, 8], [7, 7], [7, 6], [6, 4], [5, 2]]; // [길이, 높이]

// v4: 사용자 레퍼런스(고해상도 복셀 무기)를 따라 '고해상도 스프라이트 → 레이어별 두께 돌출' 방식으로 교체.
// v3(재질 칠한 큐브 13개)는 git 기록에 남김. 레이어 깊이: 자루 4px, 코등이 6px, 날 등 2.5px, 날 1px, 가시 2px, 보석 7px
import { extrude } from '../../../atelier/mc/voxel.js';
import * as SP from './scythe_sprite.mjs';
export function defaultV4() {
  const px = 0.42;                                            // 스프라이트 1px = 0.42 유닛 → 총 높이 ≈ 52 유닛
  const { tex, cubes } = extrude([
    { name: 'shaft', bone: 'scythe', canvas: SP.shaftLayer(), z: 0, depth: 5 * px },
    { name: 'blade', bone: 'blade', canvas: SP.bladeLayer(), z: 0, depth: 1 * px },
    { name: 'spine', bone: 'blade', canvas: SP.bladeLayer({ spineOnly: true }), z: 0, depth: 2.5 * px },
    { name: 'spike', bone: 'blade', canvas: SP.spikeLayer(), z: 0, depth: 2 * px },
    { name: 'collar', bone: 'scythe', canvas: SP.collarLayer(), z: 0, depth: 6 * px },
    { name: 'gem', bone: 'scythe', canvas: SP.gemLayer(), z: 0, depth: 7 * px },
  ], { px, grip: [47.5, 92] });
  const bones = [{ name: 'scythe', pivot: [0, 0, 0] }, { name: 'blade', pivot: [0, 30, 0], parent: 'scythe' }];
  return { name: 'blood_scythe', type: 'entity', texture: tex, bones, cubes: cubes.map(c => ({ ...c, light: c.name.startsWith('gem') ? 15 : undefined })), animations: {} };
}

export default defaultV4;
export function defaultV3() {
  const bones = [{ name: 'scythe', pivot: [0, 0, 0] }, { name: 'head', pivot: [0, 34, 0], parent: 'scythe' }];
  const cubes = [
    { name: 'shaft', bone: 'scythe', from: [-1, -6, -1], to: [1, 34, 1], material: handle },
    { name: 'pommel', bone: 'scythe', from: [-1.5, -9, -1.5], to: [1.5, -6, 1.5], material: P((w, h, f) => iron(w, h, f, { rivets: false })) },
    { name: 'pommel_tip', bone: 'scythe', from: [-0.5, -11, -0.5], to: [0.5, -9, 0.5], material: P((w, h) => new PixelCanvas(w, h).fill(BONE[2])) },
    { name: 'collar', bone: 'head', from: [-2, 31, -2], to: [2, 35, 2], material: P((w, h, f) => iron(w, h, f, { seed: 7 })) },
    { name: 'gem', bone: 'head', from: [-1, 32, -3], to: [1, 34, -2], material: P(glow), light: 15 },
    { name: 'gem_back', bone: 'head', from: [-1, 32, 2], to: [1, 34, 3], material: P(glow), light: 15 },
    // 날 반대편 갈고리(실루엣 균형)
    { name: 'hook', bone: 'head', from: [-0.5, 34, 1], to: [0.5, 36, 5], material: P((w, h, f) => bone(w, h, f)) },
    { name: 'crown', bone: 'head', from: [-0.5, 35, -1], to: [0.5, 38, 1], material: P((w, h, f) => bone(w, h, f)) },
  ];
  // 날: 본 사슬. 각 마디는 앞(-Z)으로 뻗고, 다음 마디는 아래로 -17°씩 휜다
  let parent = 'head', z = -2, y = 33;
  SEG.forEach(([len, hgt], i) => {
    const name = `blade_${i}`;
    bones.push({ name, pivot: [0, y, z], parent, rotation: [i === 0 ? -6 : -15, 0, 0] });
    cubes.push({ name, bone: name, from: [-0.5, y - hgt + 1, z - len], to: [0.5, y + 1, z], material: P(bladeFace), faces: { south: { hidden: i > 0 } } });
    if (i < 3) cubes.push({ name: `spine_${i}`, bone: name, from: [-0.5, y + 1, z - len + 2], to: [0.5, y + 3 - i * 0.5 > y + 1 ? y + 3 : y + 2, z - len + 3], material: P((w, h, f) => bone(w, h, f)) });
    parent = name; z -= len;
  });
  return { name: 'blood_scythe', type: 'entity', bones, cubes, colorBudget: 28, animations: {} };
}

/** 인벤토리 아이콘(16×16): 왼쪽 아래 → 오른쪽 위 자루, 오른쪽 위에서 왼쪽으로 휘는 날, 혈석 하나 */
export { scythe as icon } from './icons.mjs'; // v3: 해석적 초승달 날로 다시 그림
