// 혈철 군주 갑주 v3 — 사용자 지적(단조로운 색·명암 없음)과 평가 지적(레깅스·뒷면이 단조로움, 아이콘 뿔이 모델에 없음) 반영
// 재질: shade.mjs(면 명암 + 판금 이음새·리벳 + 금 테두리 + 뼈 관절). 투구 눈은 스킨 눈 위치(1~2열·5~6열, 3행)에 고정.
// 아이콘과 모델 일치: 갑옷은 텍스처라 뿔(형태)을 만들 수 없음 → 아이콘에서도 뿔을 빼고 '금 볏'으로 통일
import { PixelCanvas } from '../../../atelier/pixel.js';
import { Armor } from '../../../atelier/mc/skin.js';
import { paintFace, plate, boneP, trim, cloth, RAMP } from './shade.mjs';
import * as IC from './icons.mjs';

const I = RAMP.iron, G = RAMP.gold, BO = RAMP.bone, BL = RAMP.blood, GL = RAMP.glow;
const FACES4 = ['north', 'east', 'south', 'west'];
/** 영역 하나를 재질 패턴으로 칠함(면 명암 포함) */
const fill = (a, part, faces, ramp, pat, opt) => { for (const f of faces) a.draw(part, f, (c, r) => c.paste(paintFace(ramp, r.w, r.h, f, pat, opt), r.x, r.y)); };
const band = (a, part, y, ramp = 'gold', faces = FACES4) => { for (const f of faces) a.draw(part, f, (c, r) => { c.hline(r.x, r.x + r.w - 1, r.y + y, (ramp === 'gold' ? G : BL)[ramp === 'gold' ? 4 : 4]); }); };

export default function () {
  const a = new Armor('humanoid');
  // ── 투구: 판금 + 금 이마 테 + 정렬된 눈 틈 + 볼 보호대 리벳 + 뒷목 판, 정수리 금 볏
  fill(a, 'head', ['north', 'east', 'south', 'west', 'up', 'down'], 'iron', plate({ seed: 3, seam: 4 }));
  a.chars('head', 'north', 0, 0, [
    'gGGGGGGg',
    'MyyyyyyM',
    'MvvvvvvM',
    'vEeMMeEv',
    'MMMvvMMM',
    'MrMvvMrM',
    'MMMvvMMM',
    'mmmmmmmm',
  ], { g: G[3], G: G[5], y: G[2], M: I[3], m: I[1], v: I[0], r: I[5], E: GL[4], e: GL[2] });
  a.draw('head', 'up', (c, r) => { for (let y = 0; y < r.h; y++) { c.set(r.x + 3, r.y + y, G[4]); c.set(r.x + 4, r.y + y, G[2]); } });
  for (const f of ['east', 'west', 'south']) a.draw('head', f, (c, r) => { c.hline(r.x, r.x + r.w - 1, r.y, G[4]); c.set(r.x + 1, r.y + 4, I[5]); c.set(r.x + r.w - 2, r.y + 4, I[5]); });
  // ── 흉갑: 판금 위 뼈 갈비(흉골 + 3쌍) + 가운데 발광 혈석 + 금 목깃 + 피 허리띠, 등은 척추 판 + 이음새
  fill(a, 'body', ['north', 'east', 'south', 'west', 'up', 'down'], 'iron', plate({ seed: 5, seam: 4 }));
  a.chars('body', 'north', 0, 0, [
    'GGg..gGG',
    'ggyyyygg',
    '.b.BB.b.',
    '.b.BB.b.',
    '...ee...',
    'bbBEEBbb',
    '...ee...',
    'bbB..Bbb',
    '...BB...',
    '........',
    'rRRRRRRr',
    'rrrrrrrr',
  ].map(row => row), { G: G[5], g: G[3], y: G[2], b: BO[2], B: BO[4], o: I[0], e: GL[2], E: GL[4], r: BL[2], R: BL[4] });
  a.draw('body', 'south', (c, r) => { for (let y = 1; y < r.h - 1; y++) { c.set(r.x + 3, r.y + y, y % 3 ? BO[3] : BO[1]); c.set(r.x + 4, r.y + y, y % 3 ? BO[4] : BO[2]); } c.hline(r.x, r.x + r.w - 1, r.y, G[4]); });
  // ── 견갑(팔 위 6줄): 금 테 + 판금 2겹(이음새) + 피 가장자리. 아래 면 비움
  fill(a, 'arm_r', ['north', 'east', 'south', 'west', 'up'], 'iron', plate({ seed: 7, seam: 3 }));
  band(a, 'arm_r', 0, 'gold'); a.draw('arm_r', 'north', (c, r) => c.hline(r.x, r.x + r.w - 1, r.y + 5, BL[3]));
  for (const f of ['east', 'south', 'west']) a.draw('arm_r', f, (c, r) => c.hline(r.x, r.x + r.w - 1, r.y + 5, BL[3]));
  a.keepRows('arm_r', 0, 6); a.draw('arm_r', 'down', (c, r) => c.rect(r.x, r.y, r.w, r.h, null));
  // ── 부츠(다리 아래 4줄): 금 테 + 판금 + 앞코 뼈
  fill(a, 'leg_r', ['north', 'east', 'south', 'west', 'down'], 'iron', plate({ seed: 9, seam: 6, rivets: false }));
  band(a, 'leg_r', 8, 'gold'); a.keepRows('leg_r', 8, 12);
  a.draw('leg_r', 'north', (c, r) => { c.hline(r.x, r.x + r.w - 1, r.y + 10, BO[4]); c.hline(r.x, r.x + r.w - 1, r.y + 11, BO[2]); });

  const l = new Armor('humanoid_leggings');
  // ── 허리(몸 아래 5줄): 판금 벨트 + 금 버클 + 피 천 태싯(주름)
  fill(l, 'body', FACES4, 'iron', plate({ seed: 11, seam: 5, rivets: false }));
  l.draw('body', 'north', (c, r) => { c.paste(paintFace('blood', r.w, 3, 'north', cloth({ seed: 2, fold: 2, tatter: false })), r.x, r.y + 9); c.rect(r.x + 3, r.y + 8, 2, 2, G[5]); c.set(r.x + 3, r.y + 9, G[3]); });
  for (const f of FACES4) l.draw('body', f, (c, r) => c.hline(r.x, r.x + r.w - 1, r.y + 7, I[5]));
  l.keepRows('body', 7, 12);
  // ── 다리(위 10줄): 사슬 바탕 + 허벅지 판금(정면·바깥) + 뼈 무릎 보호대 + 피 테
  for (const f of FACES4) l.draw('leg_r', f, (c, r) => {
    for (let y = 0; y < 10; y++) for (let x = 0; x < r.w; x++) c.set(r.x + x, r.y + y, (x + (y >> 1)) % 2 ? I[1] : I[2]);
    if (f === 'north' || f === 'east') {
      c.paste(paintFace('iron', r.w, 5, f, plate({ seed: 13, seam: 6, rivets: false })), r.x, r.y);
      c.hline(r.x, r.x + r.w - 1, r.y + 4, BL[3]);
    }
    if (f === 'north') { c.hline(r.x, r.x + r.w - 1, r.y + 6, BO[4]); c.hline(r.x, r.x + r.w - 1, r.y + 7, BO[2]); c.set(r.x + 1, r.y + 6, BO[6]); }
  });
  l.draw('leg_r', 'up', (c, r) => c.rect(r.x, r.y, r.w, r.h, I[2]));
  l.keepRows('leg_r', 0, 10);

  const icons = { helmet: IC.helmet(), chestplate: IC.chestplate(), leggings: IC.leggings(), boots: IC.boots() };
  return { humanoid: a.canvas, leggings: l.canvas, icons };
}
