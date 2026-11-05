// 갑옷 「망령 집사복」 v2 — 갑옷을 처음부터 다시 배움(docs/research/minecraft-armor.md)
//  v1의 실패: ① 도자기 가면이 얼굴 전체(64/64)를 덮어 대두 + 캐릭터 얼굴 소실, ② 주 재질 L 5~21의 탁한 보라 21색, 결 15%, 형태 없는 평면
//  v2: 두건(이마 3줄) + 도자기 '눈가리개'(눈 줄 한 줄, 눈구멍은 비워 스킨 눈이 보임) — 입·볼은 드러냄(바닐라 domino 마스크)
//      벨벳을 밝게(L 약 25~60) + 세로 옷주름 명암 + 결 30%, 연미복 실루엣은 V자 목선·아래 사다리꼴 컷, 한 벌 11색
import { PixelCanvas } from '../../../atelier/pixel.js';
import { Armor, critiqueArmor } from '../../../atelier/mc/skin.js';
import { paintFace, fineRamp, grain, outline } from '../../../atelier/mc/shade.js';
import { OUT } from './palette.mjs';

export const VEL = fineRamp('#5a3b78', { steps: 5, dL: 0.075, hueShift: 12 });   // 벨벳 보라 5
export const POR = fineRamp('#e6dcc4', { steps: 3, dL: 0.07, hueShift: 6 });     // 도자기·크라바트 3
export const PEW = ['#7d879c', '#c9d2e0'];                                         // 백랍 단추·버클 2
export const MINT = '#3fe0b4';                                                     // 민트 솔기 1
const F4 = ['north', 'east', 'south', 'west'];
const GR = grain(0.3, 21);
/** 옷주름: 세로 주름 능선(밝음)과 골(어두움)이 3~4px 간격으로 번갈아, 아래로 갈수록 살짝 어두움 + 결 */
const folds = (base = 2, period = 3, phase = 0) => (x, y, w, h) => base + (((x + phase) % period) === 0 ? 0.9 : ((x + phase) % period) === period - 1 ? -0.6 : 0) - (y / h) * 0.5 + GR(x, y) * 0.6;
const paint = (a, part, faces, R, pat, opt) => { for (const f of faces) a.draw(part, f, (c, r) => c.paste(paintFace(R, r.w, r.h, f, pat, opt), r.x, r.y)); };

export default function () {
  const a = new Armor('humanoid');
  // ── 투구: 벨벳 두건 + 눈 줄 도자기 눈가리개
  paint(a, 'head', [...F4, 'up'], VEL, folds(2.2, 4));
  a.draw('head', 'north', (c, r) => {
    c.hline(r.x, r.x + 7, r.y, VEL[4]);                                  // 두건 앞 가장자리(빛)
    // 눈가리개(3행): 가장자리 2px + 가운데 2px, 눈구멍은 cut()이 비움. 도자기 금 1px
    [[0, 3, POR[1]], [3, 3, POR[2]], [4, 3, POR[1]], [7, 3, POR[0]], [0, 4, VEL[1]], [7, 4, VEL[1]]].forEach(([x, y, col]) => c.set(r.x + x, r.y + y, col));
    for (let x = 1; x < 7; x++) c.set(r.x + x, r.y + 2, x === 1 || x === 6 ? POR[1] : POR[2]);   // 눈가리개 윗테(이마 3번째 줄 — 얼굴은 여전히 열림)
    c.set(r.x + 5, r.y + 2, POR[0]);                                     // 도자기 금 1px
  });
  for (const f of ['east', 'west', 'south']) a.draw('head', f, (c, r) => { c.hline(r.x, r.x + 7, r.y, VEL[4]); c.hline(r.x, r.x + 7, r.y + 3, MINT); });   // 민트 솔기
  // ── 연미복: 벨벳 옷주름 + 옷깃(사선, 민트 솔기) + 크라바트 + 백랍 단추
  paint(a, 'body', F4, VEL, folds(2, 3, 1));
  a.draw('body', 'north', (c, r) => {
    [[1, 1], [2, 2], [2, 3], [5, 3], [5, 2], [6, 1]].forEach(([x, y]) => c.set(r.x + x, r.y + y, MINT));                  // 옷깃 솔기
    [[0, 2], [1, 2], [0, 3], [1, 3], [1, 4], [6, 2], [7, 2], [6, 3], [7, 3], [6, 4]].forEach(([x, y]) => c.set(r.x + x, r.y + y, VEL[0]));   // 옷깃 그늘
    c.rect(r.x + 3, r.y + 2, 2, 2, POR[2]); c.set(r.x + 4, r.y + 3, POR[1]); c.set(r.x + 3, r.y + 4, POR[0]); c.set(r.x + 4, r.y + 4, POR[1]);   // 크라바트
    for (const y of [5, 7, 9]) { c.set(r.x + 3, r.y + y, PEW[1]); c.set(r.x + 4, r.y + y, PEW[0]); }                       // 단추
  });
  a.draw('body', 'south', (c, r) => { c.vline(r.x + 3, r.y + 6, r.y + 11, VEL[0]); c.vline(r.x + 4, r.y + 6, r.y + 11, VEL[0]); c.set(r.x + 2, r.y + 6, PEW[1]); c.set(r.x + 5, r.y + 6, PEW[1]); });   // 꼬리 트임 + 허리 단추
  // ── 어깨 망토(팔 위 6줄) + 민트 단
  paint(a, 'arm_r', [...F4, 'up'], VEL, folds(2.4, 2));
  for (const f of F4) a.draw('arm_r', f, (c, r) => { c.hline(r.x, r.x + r.w - 1, r.y, VEL[4]); c.hline(r.x, r.x + r.w - 1, r.y + 5, MINT); });
  // ── 구두(다리 아래 6줄): 짙은 벨벳 각반 + 백랍 버클 + 구두코 광택
  paint(a, 'leg_r', [...F4, 'down'], VEL, (x, y) => (y >= 9 ? 0.6 : 1.4) + GR(x, y) * 0.6);
  a.draw('leg_r', 'north', (c, r) => { c.rect(r.x + 1, r.y + 9, 2, 1, PEW[1]); c.set(r.x + 2, r.y + 9, PEW[0]); c.set(r.x + 1, r.y + 11, VEL[3]); });
  a.cut({ helmet: 'domino', chest: true, armRows: 6, bootRows: 6 });

  const l = new Armor('humanoid_leggings');
  // ── 허리: 벨트 + 백랍 버클 + 열쇠고리
  paint(l, 'body', F4, VEL, folds(1.6, 3));
  for (const f of F4) l.draw('body', f, (c, r) => c.hline(r.x, r.x + r.w - 1, r.y + 8, VEL[0]));
  l.draw('body', 'north', (c, r) => { c.rect(r.x + 3, r.y + 8, 2, 1, PEW[1]); c.set(r.x + 6, r.y + 9, PEW[1]); c.set(r.x + 6, r.y + 10, PEW[0]); });
  l.keepRows('body', 7, 12);
  // ── 바지(위 9줄): 줄무늬 벨벳 → 정강이(6~8행)에서 민트 엑토플라즘으로 흩어짐
  for (const f of F4) l.draw('leg_r', f, (c, r) => {
    c.paste(paintFace(VEL, r.w, r.h, f, folds(1.6, 2), { rim: false }), r.x, r.y);
    for (let y = 6; y < 9; y++) for (let x = 0; x < r.w; x++) if (((x * 3 + y * 5) % 4) < y - 5) c.set(r.x + x, r.y + y, y === 8 ? MINT : '#2aa888');
  });
  l.keepRows('leg_r', 0, 9);

  return { humanoid: a.canvas, leggings: l.canvas, icons: icons(), issues: [...critiqueArmor(a), ...critiqueArmor(l)] };
}

/** 아이콘 4종: 갑옷과 같은 팔레트·특징(두건 + 눈가리개 + 드러난 입, 크라바트·단추, 흩어지는 바지 밑단, 버클) — 외곽선 자동 */
export function icons() {
  const L = { 0: VEL[0], 1: VEL[1], 2: VEL[2], 3: VEL[3], 4: VEL[4], p: POR[0], P: POR[1], q: POR[2], b: PEW[0], B: PEW[1], m: MINT, n: '#2aa888' };
  const draw = rows => outline(new PixelCanvas(16).chars(0, 0, rows, L), OUT);
  return {
    helmet: draw([
      '................', '.....444433.....', '....43322221....', '...4322222210...', '...3211111110...', '...mPq.qq.qPm...',
      '...3........1...', '...2........1...', '...1........0...', '................', '................', '................',
      '................', '................', '................', '................']),
    chestplate: draw([
      '................', '..4433....3322..', '.432221..122110.', '.32m1qqqqq1m110.', '.21.1mqPPm1.11..', '....21qPq121....',
      '....321Bb321....', '....2212212.....'.padEnd(16, '.'), '....321Bb321....', '....2212212.....'.padEnd(16, '.'), '....321Bb321....', '....22100122....',
      '................', '................', '................', '................']),
    leggings: draw([
      '................', '................', '....00000000....', '....2B3333B2....', '....32322323....', '....323..323....',
      '....232..232....', '....323..323....', '....2n2..2n2....', '....n.m..n.m....', '....m....m......', '................',
      '................', '................', '................', '................']),
    boots: draw([
      '................', '................', '................', '................', '................', '..222....222....',
      '..211....211....', '..2Bb....2Bb....', '..1111...1111...', '..33321..33321..', '..00000..00000..', '................',
      '................', '................', '................', '................']),
  };
}
