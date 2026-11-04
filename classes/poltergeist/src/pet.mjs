// 펫 「찻주전자 유령」 — 유령이 들어앉은 도자기 찻주전자 (밀도 2: 1유닛 = 2텍셀)
//  1차: 둥근 주전자 몸 + 앞 주둥이 + 뒤 손잡이 + 뚜껑, 아래는 민트 연기 꼬리(떠다님)
//  2차: 뚜껑과 어깨 사이 틈으로 엿보는 유령의 두 눈(얼굴 = 초점), 주둥이 끝 민트 김, 뚜껑 꼭지 민트 구슬
//  3차: 몸통 가운데 보라 다마스크 띠, 아이보리 유약 반사, 바닥 굽
//  애니메이션: idle = 둥실 + 뚜껑이 '달그락' 들썩 + 꼬리 흔들림 / walk = 앞으로 기울어 미끄러지듯 + 뚜껑 빠르게 달그락
import { PixelCanvas } from '../../../atelier/pixel.js';
import { paintFace } from '../../../atelier/mc/shade.js';
import { PEW, ECT, IVO, VEL } from './palette.mjs';

const P = paint => ({ paint });
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bayer = (x, y) => B4[(y & 3) * 4 + (x & 3)] / 16;
// 도자기: 아이보리 유약(옆면 가운데 밝은 세로 반사줄) + 몸통 가운데 다마스크 띠
const PORCELAIN = (band = false) => P((w, h, f) => {
  const c = paintFace(IVO, w, h, f, (x, y) => 3 + ((x + 0.5) / w > 0.2 && (x + 0.5) / w < 0.35 ? 1.4 : 0), { grad: 0.8 });
  if (band && f !== 'up' && f !== 'down') {
    const y0 = Math.floor(h * 0.5) - 2, y1 = y0 + 3;
    for (let y = y0; y <= y1; y++) for (let x = 0; x < w; x++) {
      const u = (x + (y === y0 || y === y1 ? 0 : 2)) % 4;
      c.set(x, y, y === y0 || y === y1 ? VEL[3] : u === 0 ? VEL[5] : u === 2 ? VEL[2] : IVO[4]);
    }
  }
  return c;
});
// 유령(뚜껑 밑 틈): 민트 바탕 + 정면에 두 눈(어두운 눈동자 + 흰 반사점)
const GHOST = P((w, h, f) => {
  const c = paintFace(ECT, w, h, f, () => 4, { rim: false, ao: false, grad: 0 });
  if (f === 'north') { const ex = [Math.floor(w * 0.22), Math.floor(w * 0.62)]; for (const x of ex) { c.rect(x, 0, 2, h, ECT[0]); c.set(x, 0, ECT[7]); } }
  return c;
});
// 연기 꼬리: 아래로 갈수록 디더로 흩어지는 민트
const WISP = P((w, h, f) => {
  const c = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = (y + 0.5) / h; if (f !== 'up' && f !== 'down' && bayer(x, y) < t * 0.8) continue; c.set(x, y, ECT[t < 0.4 ? 5 : t < 0.75 ? 4 : 3]); }
  return c;
});
const GLOW = P((w, h) => new PixelCanvas(w, h).fill(ECT[5]).set(0, 0, ECT[7]));
const PEWTER = P((w, h, f) => paintFace(PEW, w, h, f, () => 3.4));

export default function () {
  return {
    name: 'teapot_ghost', type: 'entity', density: 2, colorBudget: 34,
    bones: [
      { name: 'root', pivot: [0, 0, 0] },
      { name: 'body', pivot: [0, 6, 0], parent: 'root' },
      { name: 'lid', pivot: [0, 12, 0], parent: 'body' },
      { name: 'spout', pivot: [0, 7, -4], parent: 'body' },
      { name: 'steam', pivot: [0, 10, -7.5], parent: 'spout' },
      { name: 'tail', pivot: [0, 3.5, 0], parent: 'body' },
    ],
    cubes: [
      { name: 'belly', bone: 'body', from: [-4, 4.5, -4], to: [4, 10.5, 4], material: PORCELAIN() },
      { name: 'belly_ring', bone: 'body', from: [-4.5, 6, -4.5], to: [4.5, 9, 4.5], material: PORCELAIN(true) },   // 가운데를 부풀려 둥근 주전자 실루엣
      { name: 'foot', bone: 'body', from: [-3, 3.5, -3], to: [3, 4.5, 3], material: PORCELAIN() },
      { name: 'shoulder', bone: 'body', from: [-3.5, 10.5, -3.5], to: [3.5, 11, 3.5], material: PORCELAIN() },
      { name: 'ghost', bone: 'body', from: [-2.5, 11, -2.5], to: [2.5, 12, 2.5], material: GHOST, light: 12 },
      { name: 'lid', bone: 'lid', from: [-3, 12, -3], to: [3, 13, 3], material: PORCELAIN() },
      { name: 'lid_top', bone: 'lid', from: [-2, 13, -2], to: [2, 13.5, 2], material: PORCELAIN() },
      { name: 'knob', bone: 'lid', from: [-0.5, 13.5, -0.5], to: [0.5, 14.5, 0.5], material: GLOW, light: 15 },
      { name: 'spout_base', bone: 'spout', from: [-1, 6, -6], to: [1, 8, -4.5], material: PORCELAIN() },
      { name: 'spout_tip', bone: 'spout', from: [-0.5, 7.5, -7.5], to: [0.5, 9.5, -5.5], material: PORCELAIN() },
      { name: 'spout_rim', bone: 'spout', from: [-0.5, 9.5, -8], to: [0.5, 10, -7], material: PEWTER },
      { name: 'steam', bone: 'steam', from: [-0.5, 10, -8], to: [0.5, 12, -7], material: WISP, light: 12 },
      { name: 'handle_t', bone: 'body', from: [-0.5, 9, 4], to: [0.5, 10, 5.5], material: PORCELAIN() },
      { name: 'handle_s', bone: 'body', from: [-0.5, 5, 5.5], to: [0.5, 10, 6.5], material: PORCELAIN() },
      { name: 'handle_b', bone: 'body', from: [-0.5, 5, 4], to: [0.5, 6, 5.5], material: PORCELAIN() },
      { name: 'wisp', bone: 'tail', from: [-2, 1.5, -2], to: [2, 3.5, 2], material: WISP, light: 10 },
      { name: 'wisp_tip', bone: 'tail', from: [-1, 0, -1], to: [1, 1.5, 1], material: WISP, light: 8 },
    ],
    animations: {
      idle: { length: 1.6, loop: true, bones: {
        body: { position: { 0: [0, 0, 0], 0.8: [0, 1, 0], 1.6: [0, 0, 0] }, rotation: { 0: [0, 0, 0], 0.8: [0, 0, 3], 1.6: [0, 0, 0] } },
        lid: { position: { 0: [0, 0, 0], 0.5: [0, 0, 0], 0.6: [0, 0.8, 0], 0.7: [0, 0, 0], 0.8: [0, 0.5, 0], 0.9: [0, 0, 0], 1.6: [0, 0, 0] }, rotation: { 0.5: [0, 0, 0], 0.6: [0, 0, 10], 0.7: [0, 0, -4], 0.9: [0, 0, 0] } },
        tail: { rotation: { 0: [0, 0, 8], 0.8: [0, 0, -8], 1.6: [0, 0, 8] } },
        steam: { position: { 0: [0, 0, 0], 0.8: [0, 0.6, 0], 1.6: [0, 0, 0] } },
      } },
      walk: { length: 0.6, loop: true, bones: {
        body: { rotation: { 0: [12, 0, 4], 0.3: [12, 0, -4], 0.6: [12, 0, 4] }, position: { 0: [0, 0.4, 0], 0.3: [0, 1.2, 0], 0.6: [0, 0.4, 0] } },
        lid: { position: { 0: [0, 0, 0], 0.1: [0, 0.6, 0], 0.2: [0, 0, 0], 0.4: [0, 0.6, 0], 0.5: [0, 0, 0], 0.6: [0, 0, 0] }, rotation: { 0: [0, 0, 0], 0.1: [0, 0, 8], 0.2: [0, 0, 0], 0.4: [0, 0, -8], 0.5: [0, 0, 0] } },
        tail: { rotation: { 0: [30, 0, 0], 0.3: [40, 0, 0], 0.6: [30, 0, 0] } },
      } },
    },
  };
}
