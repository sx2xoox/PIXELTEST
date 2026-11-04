// 펫 "혈박쥐 루비" — 공중에 뜬 둥근 박쥐. 실루엣: 작은 몸통 + 넓은 두 마디 날개(몸 폭의 4배) → 작은 크기에서도 박쥐로 읽힘
// 귀여움: 몸 대비 큰 눈(발광), 짧은 귀. 색: 핏빛 몸 + 흑철 날개막 + 뼈 손가락
import { PixelCanvas } from '../../../atelier/pixel.js';
import { flesh, bone, BLOOD, IRON, BONE, GLOW } from './palette.mjs';

const P = f => ({ paint: f });
// 날개막: 가로로 긴 면. 아래 가장자리 톱니(투명), 뼈 손가락 선. tip이면 끝이 뾰족하게
const membrane = tip => P((w, h, face) => {
  const c = new PixelCanvas(w, h);
  if (face !== 'north' && face !== 'south') return c.fill(BLOOD[0]);
  for (let x = 0; x < w; x++) {
    const xx = face === 'south' ? w - 1 - x : x;                         // 앞뒤 대칭
    const t = xx / Math.max(1, w - 1);
    const bottom = tip ? Math.round((h - 1) * (1 - t * 0.85)) : h - 1 - ((xx % 3 === 2) ? 1 : 0);  // 톱니 / 끝으로 갈수록 좁아짐
    for (let y = 0; y <= bottom; y++) c.set(x, y, y === 0 ? BONE[2] : (xx % 3 === 0 ? BONE[0] : y > bottom - 1 ? BLOOD[0] : BLOOD[1])); // v2: 회색 막은 흑철처럼 보임 → 짙은 진홍 막 + 뼈 손가락
  }
  return c;
});

export default function () {
  return {
    name: 'crimson_bat', type: 'entity', colorBudget: 24,
    bones: [
      { name: 'root', pivot: [0, 0, 0] },
      { name: 'body', pivot: [0, 9, 0], parent: 'root' },
      { name: 'wing_r', pivot: [3, 10, 0], parent: 'body' },
      { name: 'wing_r_tip', pivot: [8, 10, 0], parent: 'wing_r' },
      { name: 'wing_l', pivot: [-3, 10, 0], parent: 'body' },
      { name: 'wing_l_tip', pivot: [-8, 10, 0], parent: 'wing_l' },
      { name: 'feet', pivot: [0, 6, 1], parent: 'body' },
    ],
    cubes: [
      { name: 'torso', bone: 'body', from: [-3, 6, -3], to: [3, 12, 3], material: P((w, h, f) => flesh(w, h, f, { seed: 11 })),
        faces: { north: { chars: { x: 0, y: 1, rows: [
          '......',
          'GE..EG',
          'gg..gg',
          '..ff..',
          '.b..b.',
        ], legend: { G: GLOW[2], E: GLOW[0], g: GLOW[0], f: BLOOD[0], b: BONE[3] } } } } },
      { name: 'ear_r', bone: 'body', from: [1, 12, -1], to: [3, 14, 0], material: P((w, h) => new PixelCanvas(w, h).fill(BLOOD[1]).set(0, 0, BLOOD[3])) },
      { name: 'ear_l', bone: 'body', from: [-3, 12, -1], to: [-1, 14, 0], material: P((w, h) => new PixelCanvas(w, h).fill(BLOOD[1]).set(w - 1, 0, BLOOD[3])) },
      { name: 'belly', bone: 'body', from: [-2, 6, -4], to: [2, 8, -3], material: P((w, h) => new PixelCanvas(w, h).fill(BLOOD[3])) },
      { name: 'wing_r', bone: 'wing_r', from: [3, 6, 0], to: [8, 11, 1], material: membrane(false) },
      { name: 'wing_r_tip', bone: 'wing_r_tip', from: [8, 5, 0], to: [14, 11, 1], material: membrane(true) },
      { name: 'wing_l', bone: 'wing_l', from: [-8, 6, 0], to: [-3, 11, 1], material: membrane(false) },
      { name: 'wing_l_tip', bone: 'wing_l_tip', from: [-14, 5, 0], to: [-8, 11, 1], material: membrane(true) },
      { name: 'claw_r', bone: 'feet', from: [0.5, 4, 0], to: [1.5, 6, 1], material: P((w, h, f) => bone(w, h, f)) },
      { name: 'claw_l', bone: 'feet', from: [-1.5, 4, 0], to: [-0.5, 6, 1], material: P((w, h, f) => bone(w, h, f)) },
    ],
    animations: {
      idle: { length: 1.2, loop: true, bones: {
        body: { position: { 0: [0, 0, 0], 0.6: [0, 1.2, 0], 1.2: [0, 0, 0] } },
        wing_r: { rotation: { 0: [0, 0, 18], 0.6: [0, 0, -24], 1.2: [0, 0, 18] } },
        wing_l: { rotation: { 0: [0, 0, -18], 0.6: [0, 0, 24], 1.2: [0, 0, -18] } },
        wing_r_tip: { rotation: { 0: [0, 0, 10], 0.6: [0, 0, -20], 1.2: [0, 0, 10] } },
        wing_l_tip: { rotation: { 0: [0, 0, -10], 0.6: [0, 0, 20], 1.2: [0, 0, -10] } },
      } },
      walk: { length: 0.5, loop: true, bones: {
        body: { rotation: { 0: [12, 0, 0], 0.5: [12, 0, 0] }, position: { 0: [0, 0, 0], 0.25: [0, 1.5, 0], 0.5: [0, 0, 0] } },
        wing_r: { rotation: { 0: [0, 0, 35], 0.25: [0, 0, -40], 0.5: [0, 0, 35] } },
        wing_l: { rotation: { 0: [0, 0, -35], 0.25: [0, 0, 40], 0.5: [0, 0, -35] } },
        wing_r_tip: { rotation: { 0: [0, 0, 20], 0.25: [0, 0, -30], 0.5: [0, 0, 20] } },
        wing_l_tip: { rotation: { 0: [0, 0, -20], 0.25: [0, 0, 30], 0.5: [0, 0, -20] } },
        feet: { rotation: { 0: [20, 0, 0], 0.5: [20, 0, 0] } },
      } },
    },
  };
}
