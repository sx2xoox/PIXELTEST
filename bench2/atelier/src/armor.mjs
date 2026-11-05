// 혈익 귀족 갑주 v4 — 갑옷을 처음부터 다시 배움(docs/research/minecraft-armor.md)
//  v3의 실패:
//   ① 투구 정면·옆면을 64/64 다 칠해 '대두'가 되고 스킨 얼굴이 사라짐 → 바닐라 철 투구 마스크로 눈 아래를 비움(30/64)
//   ② 색 20개, 단계 간 ΔL 11, 결 21% → 탁하고 명암이 약함 → 한 벌 10색, 판마다 베벨(위·왼쪽 밝게, 아래·오른쪽 어둡게, 이음새 1px), 결 30%
//   ③ 금 테두리가 무기(혈익낫)와 따로 놂 → 무기와 같은 콘셉트·팔레트(흑자색 금속 + 와인 안감 + 주홍 혈석)
//  흡혈 귀족 모티프: 높게 선 깃(뱀파이어 칼라), 이마와 가슴의 혈석, 와인색 안감·띠, 박쥐 날개 모양 어깨 끝
import { PixelCanvas } from '../../../atelier/pixel.js';
import { Armor, critiqueArmor } from '../../../atelier/mc/skin.js';
import { paintFace, fineRamp, grain, outline } from '../../../atelier/mc/shade.js';

// 팔레트(한 벌 10색): 금속 6단계(L 약 28~66) + 와인 3단계 + 혈석 1
export const MET = fineRamp('#5c2a48', { steps: 6, dL: 0.09, hueShift: 24, chroma: 0.12 });   // v4.5: 보라 → 핏빛 자두(폴터가이스트 보라와 구분)   // v4.4: 채도 5 → 12+(흐림 해소), 명도 폭 확대   // v4.1: 한 단계 어둡게(무게감), 밝은 끝은 L 약 60
export const WIN = fineRamp('#9c1c38', { steps: 3, dL: 0.1, hueShift: 14, chroma: 0.19 });
export const GEM = '#ff3a3a';
const F4 = ['north', 'east', 'south', 'west'];
const GR = grain(0.3, 11);

/** 판금 면: 테두리 베벨(paintFace의 rim/AO/좌우) + 안쪽 패널 + 이음새 줄 + 결 30% */
const plate = ({ base = 2.6, seams = [], vseams = [] } = {}) => (x, y, w, h) => {
  let v = base - 0.9 + GR(x, y) * 0.9;                 // v4.2: 몸통은 램프 중간~어두운 단계, 밝은 두 단계는 베벨 가장자리 전용
  if (x > 0 && x < w - 1 && y > 0 && y < h - 1) v += 0.25;
  if (seams.includes(y)) v = 0.3;                       // 판 이음새: 어두운 1px
  if (seams.includes(y - 1)) v += 1.2;                  // 이음새 바로 아래 줄은 다음 판의 밝은 윗가장자리
  if (vseams.includes(x)) v = 0.6;
  return v;
};
/**
 * v4.3 볼록 판(네더라이트 텍스처에서 배움): 판 하나 = 둥근 모서리 사각형 실루엣 + 가운데(왼쪽 위로 치우친) 밝은 덩어리 + 가장자리로 어두워짐 + 가장 바깥 1px 어두운 윤곽.
 * 평평하게 칠하고 위·아래 줄만 밝게/어둡게 하면 가로 줄무늬가 된다.
 */
function convex(c, x0, y0, w, h, R, { base = 2.2, round = 1, hi = 1.8, seed = 3 } = {}) {
  const g = grain(0.3, seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const corner = round && ((x < round || x >= w - round) && (y < round || y >= h - round));
    if (corner) continue;
    const u = (x + 0.5) / w - 0.42, v = (y + 0.5) / h - 0.38;                     // 빛: 왼쪽 위로 치우친 중심
    const d = Math.min(1, Math.hypot(u * 1.6, v * 1.3) * 1.6);
    const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
    let k = base + hi * (1 - d) - (edge ? 1 : 0) + g(x, y) * 0.7;
    if (edge && (x === 0 || y === 0) && !(x === w - 1 || y === h - 1)) k += 0.6;   // 빛 받는 위·왼쪽 테두리는 덜 어둡게
    c.set(x0 + x, y0 + y, R[Math.max(0, Math.min(R.length - 1, Math.round(k)))]);
  }
}
const paint = (a, part, faces, R, pat, opt) => { for (const f of faces) a.draw(part, f, (c, r) => c.paste(paintFace(R, r.w, r.h, f, pat, opt), r.x, r.y)); };
const px = (a, part, face, pts) => a.draw(part, face, (c, r) => pts.forEach(([x, y, col]) => c.set(r.x + x, r.y + y, col)));

export default function () {
  const a = new Armor('humanoid');
  // ── 투구: 금속 판 + 이마 와인 띠 + 이마 혈석. 정면은 철 투구 마스크(눈 아래 비움)
  paint(a, 'head', [...F4, 'up'], MET, plate({ base: 2.7, seams: [3] }));
  // 볼록 판: 정면 이마 판 2장(가운데 능선으로 나뉨) · 옆면 큰 판 · 뒷면 판
  a.draw('head', 'north', (c, r) => { convex(c, r.x, r.y, 4, 3, MET, { seed: 1 }); convex(c, r.x + 4, r.y, 4, 3, MET, { seed: 2 }); });
  for (const f of ['east', 'west']) a.draw('head', f, (c, r) => convex(c, r.x, r.y, 8, 4, MET, { seed: 3, round: 0 }));
  a.draw('head', 'south', (c, r) => { convex(c, r.x, r.y, 8, 3, MET, { seed: 4, round: 0 }); convex(c, r.x + 1, r.y + 3, 6, 3, MET, { seed: 5 }); });
  a.draw('head', 'north', (c, r) => { c.hline(r.x, r.x + 7, r.y + 2, WIN[1]); c.set(r.x, r.y + 2, WIN[2]); c.set(r.x + 3, r.y + 1, GEM); c.set(r.x + 4, r.y + 1, GEM); c.set(r.x + 3, r.y, MET[5]); c.set(r.x + 4, r.y, MET[5]); });
  for (const f of ['east', 'west', 'south']) a.draw('head', f, (c, r) => c.hline(r.x, r.x + 7, r.y + 2, WIN[1]));
  // 옆면 박쥐 날개 장식(밝은 금속 사선 3줄) — 귀 위
  for (const f of ['east', 'west']) a.draw('head', f, (c, r) => { const fl = f === 'west'; for (let i = 0; i < 3; i++) c.set(r.x + (fl ? 7 - (2 + i) : 2 + i), r.y + i, MET[5]); });
  a.draw('head', 'up', (c, r) => { for (let y = 0; y < 8; y++) { c.set(r.x + 3, r.y + y, MET[5]); c.set(r.x + 4, r.y + y, MET[3]); } });   // 정수리 능선
  // ── 흉갑: 높은 깃(위 2줄 바깥) + 가슴판 + 심장 혈석 + 아래 갑주(이음새) — V자 목선과 사다리꼴은 cut()
  paint(a, 'body', F4, MET, plate({ base: 2.5, seams: [7] }));   // v4.1: 이음새 2줄 → 1줄(줄무늬 방지)
  a.draw('body', 'north', (c, r) => {
    // 가슴판 2장(좌우, 볼록) + 배 갑주 2단 + 높은 깃 — 형태가 보이는 판금
    convex(c, r.x, r.y + 1, 4, 5, MET, { seed: 6, hi: 2 }); convex(c, r.x + 4, r.y + 1, 4, 5, MET, { seed: 7, hi: 2 });
    convex(c, r.x + 1, r.y + 6, 6, 2, MET, { seed: 8, round: 0, hi: 1.4 }); convex(c, r.x + 1, r.y + 8, 6, 2, MET, { seed: 9, round: 0, hi: 1.2 });
    [[0, 0], [1, 0], [6, 0], [7, 0]].forEach(([x, y]) => c.set(r.x + x, r.y + y, MET[5]));                           // 깃 끝 밝은 가장자리
    c.rect(r.x + 3, r.y + 3, 2, 2, GEM); c.set(r.x + 3, r.y + 3, '#ffd2c4'); c.set(r.x + 4, r.y + 4, WIN[1]);         // 심장 혈석
  });
  a.draw('body', 'south', (c, r) => { convex(c, r.x, r.y + 1, 8, 4, MET, { seed: 10, round: 0 }); for (let i = 0; i < 3; i++) convex(c, r.x + 2, r.y + 5 + i * 2, 4, 2, MET, { seed: 11 + i, round: 0, hi: 1.3 }); for (let y = 1; y < 9; y++) c.set(r.x + (y % 2 ? 0 : 7), r.y + y, WIN[0]); });   // 등: 견갑판 + 척추 판 3단
  // ── 어깨(팔 위 6줄): 판 2겹 + 와인 테 + 아래 끝 박쥐 날개 톱니
  paint(a, 'arm_r', [...F4, 'up'], MET, plate({ base: 2.8, seams: [3] }));
  for (const f of F4) a.draw('arm_r', f, (c, r) => { convex(c, r.x, r.y, r.w, 3, MET, { seed: 14, round: 0, hi: 2.2 }); convex(c, r.x, r.y + 3, r.w, 2, MET, { seed: 15, round: 0, hi: 1.2 }); c.hline(r.x, r.x + r.w - 1, r.y + 5, WIN[1]); for (let x = 0; x < r.w; x += 2) c.set(r.x + x, r.y + 5, null); });   // 둥근 어깨 2겹 + 박쥐 날개 톱니
  // ── 부츠(다리 아래 6줄): 와인 커프 + 금속 정강이 + 밝은 앞코
  paint(a, 'leg_r', [...F4, 'down'], MET, plate({ base: 2.4, seams: [9] }));
  for (const f of F4) a.draw('leg_r', f, (c, r) => c.hline(r.x, r.x + r.w - 1, r.y + 6, WIN[1]));
  for (const f of F4) a.draw('leg_r', f, (c, r) => convex(c, r.x, r.y + 7, r.w, 3, MET, { seed: 16, round: 0 }));
  a.draw('leg_r', 'north', (c, r) => { convex(c, r.x, r.y + 10, r.w, 2, MET, { seed: 17, round: 0, hi: 2.4 }); c.set(r.x + 1, r.y + 8, GEM); });
  a.cut({ helmet: 'light', chest: true, armRows: 6, bootRows: 6 });

  const l = new Armor('humanoid_leggings');
  // ── 허리(몸 아래 5줄): 금속 벨트 + 혈석 버클 + 와인 천 앞자락
  paint(l, 'body', F4, MET, plate({ base: 2.6, seams: [9] }));
  l.draw('body', 'north', (c, r) => { c.rect(r.x + 3, r.y + 8, 2, 1, GEM); c.set(r.x + 3, r.y + 8, '#ffd2c4'); for (let y = 10; y < 12; y++) for (let x = 2; x < 6; x++) c.set(r.x + x, r.y + y, WIN[(x + y) % 2]); });
  l.keepRows('body', 7, 12);
  // ── 다리(위 9줄): 와인 천(세로 주름) + 정면 무릎 판 하나만(v4.1: 금속·천이 번갈아 가로 줄무늬가 되던 것 정리)
  for (const f of F4) l.draw('leg_r', f, (c, r) => c.paste(paintFace(WIN, r.w, r.h, f, (x, y) => 1 + (x % 2 ? -0.35 : 0.25) + GR(x, y) * 0.5, { rim: false }), r.x, r.y));
  l.draw('leg_r', 'north', (c, r) => c.paste(paintFace(MET, r.w, 3, 'north', plate({ base: 3 })), r.x, r.y + 4));
  l.keepRows('leg_r', 0, 9);

  return { humanoid: a.canvas, leggings: l.canvas, icons: icons(), issues: [...critiqueArmor(a), ...critiqueArmor(l)] };
}

/** 아이콘 4종(16×16): 갑옷과 같은 팔레트·특징(이마 혈석과 열린 얼굴, 높은 깃과 심장 혈석, 와인 천, 와인 커프) — 외곽선 자동 */
export function icons() {
  const L = { 0: MET[0], 1: MET[1], 2: MET[2], 3: MET[3], 4: MET[4], 5: MET[5], w: WIN[0], W: WIN[1], v: WIN[2], g: GEM, h: '#ffd2c4' };
  const draw = rows => outline(new PixelCanvas(16).chars(0, 0, rows, L), '#120a14');
  return {
    helmet: draw([
      '................', '................', '.....554433.....', '....54433332....', '...5433gg3322...', '...WWWWWWWWWW...',
      '...43.3443.32...', '...32..33..21...', '...32......21...', '...21......10...', '................', '................',
      '................', '................', '................', '................']),
    chestplate: draw([
      '................', '..55........55..', '.5435......5332.', '.4433v4554v3322.', '.3322344443322 1.'.replace(' ', '1'), '..1.4hg43gg3.1..',
      '....3gg44gg3....', '....43344332....', '....11111110....', '....43344332....', '....32333221....', '.....233332.....',
      '......2222......', '................', '................', '................']),
    leggings: draw([
      '................', '................', '....55444433....', '....3322gg21....', '....WwWWWWwW....', '....54W..54W....',
      '....43w..43w....', '....WW1..WW1....', '....55W..55W....', '....33w..33w....', '....WWw..WWw....', '....WWw..WWw....',
      '................', '................', '................', '................']),
    boots: draw([
      '................', '................', '................', '................', '..WWW....WWW....', '..433....433....',
      '..432....432....', '..3g2....3g2....', '..3221...3221...', '..54443..54443..', '..11110..11110..', '................',
      '................', '................', '................', '................']),
  };
}
