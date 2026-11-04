// 플레이어 스킨 + 갑옷 (독자 디자인: 숲 레인저 / 베르다이트 판금)
// 스킨 감각: 얼굴은 8×8이 전부 → 눈은 2px(흰자+눈동자), 코는 그림자 1~2px, 입은 생략하거나 1~2px.
//            후드·망토 같은 두께감은 오버레이 층(투명 가능)에, 기본 층은 빈틈없이.
// 갑옷 감각: 기본 피부보다 1유닛 부풀어 보이므로 테두리(트림)와 리벳 같은 포인트로 덩어리를 나눈다.
import { Skin, Armor, playerSpec } from '../../atelier/mc/skin.js';
import { pixelRamp } from '../../atelier/pixel.js';

const C = {
  skin: pixelRamp('#d9a47c', 4, { spread: 0.05 }),
  hair: '#5a3b25',
  tunic: '#4f6f3a', cloak: '#2f4a2c', leather: '#6b4528', leatherDark: '#3f2a1b', buckle: '#e0b85a',
  pants: '#5a4632', eyeW: '#f2efe8', eye: '#2f5d4a',
};

function makeSkin() {
  const s = new Skin({ slim: false });
  // 머리 기본 층
  s.fillPart('head', 'fur', { base: C.hair, strand: 2 });
  s.fillPart('head', 'skin', { base: C.skin[2] }, { faces: ['north'] });
  s.chars('head', 'north', 0, 0, [
    'hhhhhhhh',
    'hhhhhhhh',
    'hHssssHh',
    'sWEssEWs',
    'ssssssss',
    'sssnnsss',
    'sssmmsss',
    'ssssssss',
  ], { h: C.hair, H: '#7a5636', s: C.skin[2], W: C.eyeW, E: C.eye, n: C.skin[1], m: C.skin[0] });
  // 옆머리 아래쪽은 피부(귀·볼), 뒤쪽 2줄은 머리
  for (const f of ['east', 'west']) s.draw('head', f, (c, r) => c.rect(r.x + (f === 'east' ? 0 : 2), r.y + 3, 6, 5, C.skin[2]));
  // 후드(오버레이): 정면은 얼굴 둘레 테두리만
  s.fillPart('head', 'cloth', { base: C.tunic, pattern: 'weave' }, { layer: 'overlay', faces: ['up', 'east', 'west', 'south'] });
  s.chars('head', 'north', 0, 0, [
    'TTTTTTTT',
    'Tt....tT',
    'T......T',
    'T......T',
    'T......T',
    't......t',
    '........',
    '........',
  ], { T: C.tunic, t: '#3e5a2d' }, 'overlay');

  // 몸통: 튜닉 + 벨트 + 어깨끈(대각선)
  s.fillPart('body', 'cloth', { base: C.tunic, pattern: 'weave' });
  s.band('body', 8, 1, C.leather).band('body', 9, 1, C.leatherDark);
  s.chars('body', 'north', 3, 8, ['BB'], { B: C.buckle });
  s.draw('body', 'north', (c, r) => { for (let i = 0; i < 8; i++) c.set(r.x + i, r.y + i, C.leather); });
  // 망토(오버레이): 등 전체 + 옆면 뒤쪽 가장자리, 어깨 위
  s.fillPart('body', 'cloth', { base: C.cloak, pattern: 'stripe' }, { layer: 'overlay', faces: ['south', 'up'] });
  for (const f of ['east', 'west']) s.draw('body', f, (c, r) => c.rect(r.x + (f === 'east' ? 3 : 0), r.y, 1, 11, C.cloak), 'overlay');

  // 팔: 소매(튜닉) + 장갑
  for (const arm of ['arm_r', 'arm_l']) {
    s.fillPart(arm, 'cloth', { base: C.tunic, pattern: 'weave' });
    s.band(arm, 8, 4, C.leather).band(arm, 8, 1, '#8a5c38');
    s.fillPart(arm, 'solid', { color: C.leatherDark }, { faces: ['down'] });
  }
  // 다리: 바지 + 부츠
  for (const leg of ['leg_r', 'leg_l']) {
    s.fillPart(leg, 'cloth', { base: C.pants, pattern: 'weave' });
    s.band(leg, 7, 5, C.leatherDark).band(leg, 7, 1, C.leather);
    s.fillPart(leg, 'solid', { color: C.leatherDark }, { faces: ['down'] });
  }
  // v2: 입체 음영 + 주름 (평면 노이즈만으로는 아마추어처럼 보인다)
  for (const part of ['body', 'arm_r', 'arm_l', 'leg_r', 'leg_l']) s.shade(part);
  s.shade('head', { light: 0.1, dark: 0.12, ao: 0 });
  s.fold('body', 'north', 2, 10, 11).fold('body', 'north', 6, 10, 11);           // 벨트 아래 치마 주름
  s.fold('leg_r', 'north', 2, 2, 5).fold('leg_l', 'north', 2, 2, 5);             // 무릎 주름
  s.shade('body', { light: 0.1, dark: 0.3, ao: 0, layer: 'overlay' });           // 망토 아래로 어둡게
  return s;
}

function makeArmor() {
  const steel = { base: '#86aaa6', rivets: false };
  const trim = '#d6b154', gem = '#3fd0a8';
  const a = new Armor('humanoid');
  a.fillPart('head', 'metal', steel);
  a.band('head', 0, 1, trim);
  // v2: 눈높이 검은 띠는 선글라스처럼 보임 → 얼굴이 열린 투구 + 코 보호대(nasal) + 볼 보호대
  a.chars('head', 'north', 0, 0, [
    'gggggggg',
    'MMMgMMMM',
    'Mm.NN.mM',
    'M..NN..M',
    'M..NN..M',
    'Mc....cM',
    'Mc....cM',
    'mm....mm',
  ], { g: trim, M: '#86aaa6', m: '#5f7f7c', N: '#a8c4c0', c: '#6f918d' });
  // 열린 부분(.)은 투명: chars는 '.'을 건너뛰므로 금속 바탕을 직접 지운다
  a.draw('head', 'north', (c, r) => {
    const rows = ['gggggggg','MMMgMMMM','Mm.NN.mM','M..NN..M','M..NN..M','Mc....cM','Mc....cM','mm....mm'];
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '.') c.set(r.x + x, r.y + y, null); }));
  });
  a.chars('head', 'up', 3, 0, ['gg', 'gg', 'gg', 'gg', 'gg', 'gg', 'gg', 'gg'], { g: trim }); // 볏
  a.fillPart('body', 'metal', steel);
  a.band('body', 0, 1, trim).band('body', 11, 1, trim);
  a.chars('body', 'north', 2, 3, [
    '.gggg.',
    'gGeeGg',
    'gGeeGg',
    '.gggg.',
  ], { g: trim, G: '#a88a3c', e: gem });
  for (const arm of ['arm_r']) { a.fillPart(arm, 'metal', steel); a.band(arm, 0, 1, trim).band(arm, 4, 1, trim); a.keepRows(arm, 0, 5); a.draw(arm, 'down', (c, r) => c.rect(r.x, r.y, r.w, r.h, null)); } // 견갑만 남기므로 손 높이의 아래 면도 비운다
  a.fillPart('leg_r', 'metal', steel); a.band('leg_r', 8, 1, trim); a.keepRows('leg_r', 8, 12);
  a.fillPart('leg_r', 'metal', steel, { faces: ['down'] });

  const l = new Armor('humanoid_leggings');
  l.fillPart('body', 'metal', steel); l.band('body', 7, 1, trim); l.keepRows('body', 7, 12);
  l.fillPart('leg_r', 'cloth', { base: '#7d8a8c', pattern: 'weave' }); l.band('leg_r', 0, 1, '#5f6b6d'); l.keepRows('leg_r', 0, 9);
  return { humanoid: a, humanoid_leggings: l };
}

const skin = makeSkin();
const armor = makeArmor();

export const files = {
  'forest_ranger.skin.png': skin.canvas,
  'verdite.humanoid.png': armor.humanoid.canvas,
  'verdite.humanoid_leggings.png': armor.humanoid_leggings.canvas,
};
export const skinRef = skin;

export default () => ({ ...playerSpec(skin, { name: 'forest_ranger' }), extraFiles: files });
export const armored = () => ({ ...playerSpec(skin, { name: 'forest_ranger_armored', armor }), extraFiles: {} });
