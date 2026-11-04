// 혈철 군주 갑주 — 64×32 두 장 + 아이콘 4개
// 색 예산: 바닐라 갑옷 텍스처는 9~10색(26.3 jar 실측) → 텍스처당 12색 이하. 팔레트에서 골라 쓴다.
import { PixelCanvas } from '../../../atelier/pixel.js';
import { Armor } from '../../../atelier/mc/skin.js';
import { BLOOD, IRON, BONE, GLOW } from './palette.mjs';
import * as IC from './icons.mjs';

const plate = (a, part, faces = ['north', 'east', 'south', 'west', 'up', 'down']) => {
  for (const f of faces) a.draw(part, f, (c, r) => {
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
      const v = (x * 7 + y * 13) % 11 === 0 ? IRON[3] : IRON[2];
      c.set(r.x + x, r.y + y, y === 0 && f !== 'up' && f !== 'down' ? IRON[4] : y === r.h - 1 && f !== 'up' && f !== 'down' ? IRON[1] : v);
    }
  });
};

export default function () {
  const a = new Armor('humanoid');
  // 투구
  plate(a, 'head');
  // v2: 눈을 스킨의 눈 위치(1~2열·5~6열, 3행)에 정확히 맞추고 좌우 대칭. 가운데 T자 제거(콧등은 흑철)
  a.chars('head', 'north', 0, 0, [
    'MMMMMMMM',
    'MRRRRRRM',
    'MvvvvvvM',
    'vEeMMeEv',
    'MMMvvMMM',
    'MvMvvMvM',
    'MMMvvMMM',
    'mmmmmmmm',
  ], { M: IRON[2], m: IRON[1], v: IRON[0], R: BLOOD[3], e: GLOW[0], E: GLOW[2] });
  for (const f of ['east', 'west', 'south']) a.draw('head', f, (c, r) => { c.hline(r.x, r.x + r.w - 1, r.y, BLOOD[3]); c.hline(r.x, r.x + r.w - 1, r.y + 4, BLOOD[1]); });
  a.draw('head', 'up', (c, r) => { c.rect(r.x + 3, r.y, 2, r.h, BONE[2]); c.vline(r.x + 3, r.y, r.y + r.h - 1, BONE[1]); });   // 뼈 볏
  // 흉갑
  plate(a, 'body');
  a.chars('body', 'north', 0, 1, [
    '...bb...',
    'oo.bb.oo',
    '...gg...',
    'oo.GG.oo',
    '...gg...',
    'oo.bb.oo',
    '...bb...',
  ], { b: BONE[2], o: BONE[1], g: GLOW[0], G: GLOW[2] });
  a.band('body', 10, 1, BLOOD[3]).band('body', 11, 1, BLOOD[1]);
  a.draw('body', 'south', (c, r) => { for (let y = 2; y < 10; y += 2) c.hline(r.x + 1, r.x + r.w - 2, r.y + y, IRON[1]); c.vline(r.x + 3, r.y + 1, r.y + 9, BONE[1]); c.vline(r.x + 4, r.y + 1, r.y + 9, BONE[2]); });
  // 견갑(팔 위 6줄): 뼈 테두리 + 핏빛 띠
  plate(a, 'arm_r'); a.band('arm_r', 0, 1, BONE[2]).band('arm_r', 5, 1, BLOOD[3]); a.keepRows('arm_r', 0, 6);
  a.draw('arm_r', 'down', (c, r) => c.rect(r.x, r.y, r.w, r.h, null));
  // 부츠(다리 아래 4줄)
  plate(a, 'leg_r'); a.band('leg_r', 8, 1, BLOOD[3]); a.keepRows('leg_r', 8, 12);
  a.draw('leg_r', 'north', (c, r) => c.rect(r.x, r.y + 10, r.w, 2, BONE[2]));
  a.draw('leg_r', 'down', (c, r) => c.rect(r.x, r.y, r.w, r.h, IRON[1]));

  const l = new Armor('humanoid_leggings');
  plate(l, 'body'); l.band('body', 7, 1, IRON[4]).band('body', 9, 1, BLOOD[1]); l.keepRows('body', 7, 12);
  l.draw('body', 'north', (c, r) => c.rect(r.x + 3, r.y + 8, 2, 2, BONE[2]));
  l.draw('leg_r', 'north', () => {});
  for (const f of ['north', 'east', 'south', 'west']) l.draw('leg_r', f, (c, r) => {
    for (let y = 0; y < 10; y++) for (let x = 0; x < r.w; x++) c.set(r.x + x, r.y + y, (x + (y >> 1)) % 2 ? '#2b2630' : IRON[2]); // 사슬(v3: 체커 대비를 낮춰 멀리서는 면, 가까이서는 고리)
    // v3: 거대한 빨간 판이 하체를 덮어 시선을 뺏음 → 정면만 4줄짜리 흑철 태싯, 빨강은 아래 가장자리 한 줄
    if (f === 'north') for (let y = 0; y < 4; y++) c.hline(r.x, r.x + r.w - 1, r.y + y, y === 0 ? IRON[4] : y === 3 ? BLOOD[3] : IRON[3]);
  });
  l.draw('leg_r', 'up', (c, r) => c.rect(r.x, r.y, r.w, r.h, IRON[1]));
  l.keepRows('leg_r', 0, 10);

  // 아이콘 v2: icons.mjs(바닐라 아이콘 문법으로 다시 그림)
  const icons = { helmet: IC.helmet(), chestplate: IC.chestplate(), leggings: IC.leggings(), boots: IC.boots() };
  return { humanoid: a.canvas, leggings: l.canvas, icons };
}
