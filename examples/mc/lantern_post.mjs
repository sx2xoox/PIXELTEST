// 블록 모델: 돌 받침 + 원목 기둥 + 판자 팔 + 체인(교차 평면 ±45°) + 발광 랜턴
// 마인크래프트 감각: 정수 텍셀, Java 회전 규칙(한 축·22.5° 단위), 얇은 장식은 교차 평면으로
import { PixelCanvas } from '../../atelier/pixel.js';

// 철창: 테두리 막대만 있고 가운데는 투명 → 안쪽 발광체가 비쳐 보임
const cage = (w, h) => new PixelCanvas(w, h).chars(0, 0, [
  'i..i',
  'I..I',
  'I..I',
  'I..I',
  'i..i',
], { i: '#3d434e', I: '#565e6c' });

export default {
  name: 'lantern_post',
  type: 'block',
  materials: {
    stone: { mat: 'cobble', base: '#80838a', stones: 5 },
    wood: { mat: 'log', bark: '#5e4a36', inner: '#c49d66' },
    plank: { mat: 'planks', base: '#b08d5c', board: 2 },
    iron: { mat: 'metal', base: '#5b6270', rivets: false },
    glow: { mat: 'glow', base: '#ffc65a' },
    chain: { mat: 'solid', color: '#4a505c' },
  },
  cubes: [
    { name: 'base', from: [3, 0, 3], to: [13, 3, 13], material: 'stone' },
    { name: 'post', from: [6, 3, 6], to: [10, 14, 10], material: 'wood' },
    // v2: 랜턴을 4×5로 키우고(기둥 대비 존재감), 옆면에 철 프레임 막대를 그려 "랜턴"으로 읽히게 함
    { name: 'arm', from: [10, 12, 8], to: [15, 13, 10], material: 'plank' },
    { name: 'chain_a', from: [12.5, 11, 9], to: [13.5, 12, 9], material: 'chain', rotation: { axis: 'y', angle: 45, origin: [13, 11.5, 9] } },
    { name: 'chain_b', from: [12.5, 11, 9], to: [13.5, 12, 9], material: 'chain', rotation: { axis: 'y', angle: -45, origin: [13, 11.5, 9] } },
    { name: 'cap', from: [11, 10, 7], to: [15, 11, 11], material: 'iron' },
    { name: 'lamp', from: [11.5, 5, 7.5], to: [14.5, 10, 10.5], material: 'glow', light: 15 },
    { name: 'cage', from: [11, 5, 7], to: [15, 10, 11], material: { paint: cage }, faces: { up: { hidden: true }, down: { hidden: true } } },
    { name: 'foot', from: [11, 4, 7], to: [15, 5, 11], material: 'iron' },
  ],
};
