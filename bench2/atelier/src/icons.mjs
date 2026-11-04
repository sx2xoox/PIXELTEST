// 아이콘 v2 — 바닐라 아이콘 문법(16×16의 70~80% 실루엣, 4~5단 명암, 왼쪽 위 하이라이트, 어두운 외곽선)을 따라 다시 그림
// 각 행 길이 16, 좌우 대칭 아이콘은 대칭을 코드로 검증한다(손으로 찍을 때의 실수 방지).
import { PixelCanvas } from '../../../atelier/pixel.js';
import { BLOOD, IRON, BONE } from './palette.mjs';

export const L = {
  o: '#140b10',                                              // 외곽선
  1: IRON[1], 2: IRON[2], 3: IRON[3], 4: IRON[4], 5: '#958a9b', // 흑철 5단(5 = 반사광)
  r: BLOOD[1], R: BLOOD[3], h: BLOOD[4],                      // 피 3단
  b: BONE[0], B: BONE[1], W: BONE[2],                         // 뼈 3단
  e: '#ff3b46', E: '#ffd9cc',                                 // 발광
  u: '#8a5a18', y: '#dcb04a', Y: '#fff4c0',                   // 금(갑옷 v3와 같은 램프)
};

export function draw(rows, { symmetric = false, name = '' } = {}) {
  if (rows.length !== 16) throw new Error(`${name}: 16행이 아님(${rows.length})`);
  rows.forEach((r, i) => { if (r.length !== 16) throw new Error(`${name}: ${i}행 길이 ${r.length}`); });
  if (symmetric) rows.forEach((r, i) => {
    // 대칭 검사(밝기 단계는 왼쪽 위 광원 때문에 좌우가 다를 수 있으므로 '채움 여부'만 비교)
    const m = [...r].map(c => (c === '.' ? 0 : 1)).join(''), mr = [...m].reverse().join('');
    if (m !== mr) throw new Error(`${name}: ${i}행 실루엣이 좌우 대칭이 아님 "${r}"`);
  });
  return new PixelCanvas(16).chars(0, 0, rows, L);
}

// v3: 모델과 일치 — 뿔 제거(갑옷은 텍스처라 뿔을 만들 수 없음), 금 볏 + 금 이마 테 + 정렬된 눈 틈
export const helmet = () => draw([
  '................',
  '.......oo.......',
  '......oYyo......',
  '....oooyuooo....',
  '...o54yuy333o...',
  '..o4433333322o..',
  '..oyYyyyyyyyuo..',
  '..o3oeEooEeo2o..',
  '..o3322oo2233o..',
  '..o32o2oo2o23o..',
  '..o2211oo1122o..',
  '...o21oooo12o...',
  '....oo....oo....',
  '................',
  '................',
  '................',
], { name: 'helmet' });

export const chestplate = () => draw([
  '................',
  '.oooo......oooo.',
  'o5443o....o3332o',
  'o44yYyooooyYy32o',
  'o43oouyWWyuoo22o',
  '.oo.o4BeeB2o.oo.',
  '....o3WEEW2o....',
  '....oB3BB3Bo....',
  '....o3BWWB2o....',
  '....oB3223Bo....',
  '....oRRhhRRo....',
  '....o211112o....',
  '.....oooooo.....',
  '................',
  '................',
  '................',
], { symmetric: true, name: 'chestplate' });

export const leggings = () => draw([
  '................',
  '................',
  '...ooooooooooo..',
  '...o544433332o..',
  '...oRRRRYRRRRo..',
  '...o4332o2332o..',
  '...o532o.o232o..',
  '...o432o.o232o..',
  '...oWBbo.oWBbo..',
  '...o432o.o232o..',
  '...o321o.o122o..',
  '...o221o.o121o..',
  '...ooooo.ooooo..',
  '................',
  '................',
  '................',
], { name: 'leggings' });

export function boots() {
  const boot = ['.ooo..', 'oy4o..', 'o43o..', 'o32o..', 'o32oo.', 'o3WWWo', 'o21BBo', '.ooooo']; // v3: 위 테를 금으로(모델과 일치)
  const c = new PixelCanvas(16);
  c.chars(1, 5, boot, L); c.chars(8, 5, boot, L);
  return c;
}

/** 피의 낫 아이콘 v5(혈익낫): 날개뼈 발톱이 솟은 막, 크림 날선, 왕관의 심장 혈석, 와인 감개, 핏방울 폼멜. 외곽선은 자동 */
import { C as SC } from './scythe_sprite.mjs';
const L5 = { M: SC.V4, m: SC.V3, n: SC.V2, v: SC.V1, b: SC.B1, w: SC.B2, r: SC.B3, R: SC.B4, e: SC.B5, g: SC.G1, p: SC.G2, c: SC.G3 };
export function scythe() {
  const c = new PixelCanvas(16).chars(0, 0, [
    '..M...M....M.M..',
    '..mw..mw...mMm..',
    '.bmrw.mrww.ngpn.',
    '.bRRRwRRRwngcgn.',
    'bReeeeeeeRnggg..',
    'beccccRRe.nmv...',
    'becc.....nmv....',
    'ec......nmv.....',
    'ec.....nmv......',
    'c.....nmv.......',
    '.....bRw........',
    '....eRw.........',
    '...RRb..........',
    '..nmv...........',
    '.Mmv............',
    '.gg.............',
  ], L5);
  const add = []; c.each((x, y) => { if (!c.alpha(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => c.alpha(x + dx, y + dy))) add.push([x, y]); });
  for (const [x, y] of add) c.set(x, y, SC.K0);
  return c;
}
