// 혈철 군주 갑주 — 64×32 두 장 + 아이콘 4개
// 색 예산: 바닐라 갑옷 텍스처는 9~10색(26.3 jar 실측) → 텍스처당 12색 이하. 팔레트에서 골라 쓴다.
import { PixelCanvas } from '../../../atelier/pixel.js';
import { Armor } from '../../../atelier/mc/skin.js';
import { BLOOD, IRON, BONE, GLOW } from './palette.mjs';

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
  a.chars('head', 'north', 0, 0, [
    'tttttttt',
    'MMMMMMMM',
    'MMMvvMMM',
    'MveevveM',
    'MMMvvMMM',
    'MMMvvMMM',
    'MmMvvMmM',
    'mmmmmmmm',
  ], { t: BLOOD[3], M: IRON[2], m: IRON[1], v: IRON[0], e: GLOW[0] });
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
  plate(l, 'body'); l.band('body', 7, 1, IRON[4]).band('body', 8, 1, BLOOD[1]); l.keepRows('body', 7, 12);
  l.draw('body', 'north', (c, r) => c.rect(r.x + 3, r.y + 8, 2, 2, BONE[2]));
  l.draw('leg_r', 'north', () => {});
  for (const f of ['north', 'east', 'south', 'west']) l.draw('leg_r', f, (c, r) => {
    for (let y = 0; y < 10; y++) for (let x = 0; x < r.w; x++) c.set(r.x + x, r.y + y, (x + (y >> 1)) % 2 ? IRON[1] : IRON[2]); // 사슬(v2: 1px 체커는 멀리서 노이즈 → 2px 엇갈린 고리)
    if (f === 'north' || f === 'east') for (let y = 0; y < 5; y++) c.hline(r.x, r.x + r.w - 1, r.y + y, y === 0 ? BLOOD[3] : y === 4 ? BLOOD[0] : BLOOD[2]); // 핏빛 태싯
  });
  l.draw('leg_r', 'up', (c, r) => c.rect(r.x, r.y, r.w, r.h, IRON[1]));
  l.keepRows('leg_r', 0, 10);

  // 아이콘(16×16): 네더라이트처럼 어둡게(최대 명도 ~0.5) + 핏빛 포인트 하나
  const L = { I: IRON[3], i: IRON[2], d: IRON[1], r: BLOOD[3], R: BLOOD[4], b: BONE[2], g: GLOW[0] };
  const ic = rows => new PixelCanvas(16).chars(0, 0, rows, L).outline('#110a0e');
  const icons = {
    helmet: ic(['................', '................', '.....bbbbbb.....', '....rIIIIIIr....', '...IIIIIIIIII...', '...IiiiIIiiiI...', '...IidgddgdiI...', '...Ii.dIId.iI...', '...Ii.dIId.iI...', '...dd.dddd.dd...', '................', '................', '................', '................', '................', '................']),
    chestplate: ic(['................', '..IIII....IIII..', '..IiiIIIIIIiiI..', '..IiiiibbiiiiI..', '...Iibibbibii...', '...IiiigRiiiI...', '...Iibibbibii...', '...IiiiibbiiiI..', '...Iiiiiiiiii...', '...rrrrrrrrrr...', '...Iiiiiiiiii...', '...IIIIIIIIII...', '................', '................', '................', '................']),
    leggings: ic(['................', '................', '...IIIIIIIIII...', '...rrrrbbrrrr...', '...Iiiiiiiiii...', '...rRri..irRr...', '...rrri..irrr...', '...Iii....iiI...', '...Iid....diI...', '...Iid....diI...', '...Iid....diI...', '...ddd....ddd...', '................', '................', '................', '................']),
    boots: ic(['................', '................', '................', '................', '................', '...rrrr..rrrr...', '...Iiii..iiiI...', '...Iiii..iiiI...', '...Iiid..diiI...', '..bbIid..diIbb..', '..bbddd..dddbb..', '................', '................', '................', '................', '................']),
  };
  return { humanoid: a.canvas, leggings: l.canvas, icons };
}
