// B5 작은 버섯 정령 (엔티티 + 걷기)
// 실루엣: 계단형 돔 갓 vs 대 6 → 버섯으로 즉시 읽힘. 점무늬는 떠 있는 큐브가 아니라 텍스처로(z-fighting·부유 방지).
// 얼굴: 세로로 긴 1×2 눈을 낮게, 볼터치 → 귀여움. 갓 아랫면 주름(gill)으로 디테일 포인트.
// r1→v2: 갓 노이즈 대비를 낮추고 점을 크게, 얼굴을 1칸 내림
// r2(블라인드 평가 반영): 2단 갓이 케이크처럼 보임 → 12→10→6 세 단 돔 / 다리 간격 2칸 / 대 옆면 체크 노이즈 제거
import { PixelCanvas, pixelRamp } from '../../atelier/pixel.js';

const capR = pixelRamp('#d8473a', 4, { spread: 0.09, hueShift: 18 });
const spot = '#f6ead2';
const spots = pts => ({ paint: (w, h, face) => {
  const c = new PixelCanvas(w, h).noiseFill(capR.slice(1, 3), { cell: 6, contrast: 0.5, seed: w * 7 + h });
  for (const [x, y, s] of pts(w, h, face)) c.rect(x, y, s, s, spot), c.set(x + s - 1, y + s - 1, '#d9c7a6');
  if (face !== 'up' && face !== 'down' && h >= 3) c.hline(0, w - 1, h - 1, capR[0]); // 갓 테두리 아래 그림자(아래 단만)
  return c;
} });

export default {
  name: 'mushroom_spirit',
  type: 'entity',
  materials: {
    capLow: spots((w, h, f) => (f === 'up' ? [[1, 1, 3], [8, 2, 2], [4, 7, 3], [9, 9, 2]] : [[1, 0, 2], [7, 1, 2]])),
    capTop: spots((w, h, f) => (f === 'up' ? (w >= 10 ? [[1, 1, 2], [7, 6, 2]] : [[1, 1, 2]]) : [])),
    gills: { paint: (w, h) => { const c = new PixelCanvas(w, h).fill('#d9bf98'); for (let x = 1; x < w; x += 2) c.vline(x, 1, h - 2, '#b8976c'); c.rect(Math.floor(w / 2) - 3, Math.floor(h / 2) - 3, 6, 6, '#c9ad85'); return c; } },
    // r2: 매끈한 대 — 위쪽 2줄은 갓 그늘, 맨 아래 1줄 살짝 어둡게
    stem: { paint: (w, h, f) => { const c = new PixelCanvas(w, h).fill('#efe1c6'); if (f !== 'up' && f !== 'down') { c.hline(0, w - 1, 0, '#cdb995'); c.hline(0, w - 1, 1, '#e0cfae'); c.hline(0, w - 1, h - 1, '#e6d6b8'); } return c; } },
    foot: { mat: 'skin', base: '#d9c6a3' },
  },
  bones: [
    { name: 'root', pivot: [0, 0, 0] },
    { name: 'body', pivot: [0, 3, 0], parent: 'root' },
    { name: 'cap', pivot: [0, 9, 0], parent: 'body' },
    { name: 'leg_r', pivot: [2, 3, 0], parent: 'root' },
    { name: 'leg_l', pivot: [-2, 3, 0], parent: 'root' },
  ],
  cubes: [
    { name: 'stem', bone: 'body', from: [-3, 3, -3], to: [3, 9, 3], material: 'stem',
      faces: { north: { chars: { x: 0, y: 0, rows: [
        '......',
        '......',
        '.E..E.',
        '.e..e.',
        'b.mm.b',
        '......',
      ], legend: { E: '#2b2230', e: '#5a4a5e', b: '#f0a8a0', m: '#a05a50' } } } } },
    { name: 'cap_low', bone: 'cap', from: [-6, 9, -6], to: [6, 12, 6], material: 'capLow', faces: { down: { material: 'gills' } } },
    { name: 'cap_mid', bone: 'cap', from: [-5, 12, -5], to: [5, 13, 5], material: 'capTop', faces: { down: { hidden: true } } },
    { name: 'cap_top', bone: 'cap', from: [-3, 13, -3], to: [3, 14, 3], material: 'capTop', faces: { down: { hidden: true } } },
    { name: 'leg_r', bone: 'leg_r', from: [1, 0, -1.5], to: [3, 3, 1.5], material: 'foot' },
    { name: 'leg_l', bone: 'leg_l', from: [-3, 0, -1.5], to: [-1, 3, 1.5], material: 'foot' },
  ],
  animations: {
    walk: { length: 0.8, loop: true, bones: {
      leg_r: { rotation: { 0: [35, 0, 0], 0.4: [-35, 0, 0], 0.8: [35, 0, 0] } },
      leg_l: { rotation: { 0: [-35, 0, 0], 0.4: [35, 0, 0], 0.8: [-35, 0, 0] } },
      body: { position: { 0: [0, 0, 0], 0.2: [0, 0.6, 0], 0.4: [0, 0, 0], 0.6: [0, 0.6, 0], 0.8: [0, 0, 0] } },
      cap: { rotation: { 0: [0, 0, 4], 0.4: [0, 0, -4], 0.8: [0, 0, 4] } },
    } },
  },
};
