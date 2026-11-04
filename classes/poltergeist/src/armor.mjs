// 갑옷 「망령 집사복」 — 빅토리아 저택의 집사였던 망령 (CONCEPT.md §4)
//  1차: 두건 + 도자기 가면 / 연미복 / 해진 바지 / 버클 구두
//  2차: 깨진 가면, 아이보리 크라바트와 민트 핀, 회색 조끼와 백랍 단추, 짧은 어깨 망토, 허리 열쇠고리
//  3차: 벨벳의 다마스크 문양, 민트 솔기(옷깃·소매 끝), 정강이부터 엑토플라즘으로 흩어지는 바지
//  눈: 스킨 눈 위치(1~2열·5~6열, 3행)에 정확히 맞춘 민트 눈구멍 = 얼굴의 초점
import { Armor } from '../../../atelier/mc/skin.js';
import { PixelCanvas } from '../../../atelier/pixel.js';
import { paintFace, outline } from '../../../atelier/mc/shade.js';
import { OUT, PEW, ECT, IVO, VEL, MAH } from './palette.mjs';

const F4 = ['north', 'east', 'south', 'west'], F6 = [...F4, 'up', 'down'];
const damask = (base = 2.4) => (x, y) => { const u = ((x % 4) + 4) % 4, v = ((y + (Math.floor(x / 4) % 2) * 2) % 4 + 4) % 4; return base + ((u === 1 && v === 1) ? 1 : (u + v === 2 || Math.abs(u - v) === 2) && u !== v ? 0.45 : 0); };
const fill = (a, part, faces, R, pat, opt) => { for (const f of faces) a.draw(part, f, (c, r) => c.paste(paintFace(R, r.w, r.h, f, pat, opt), r.x, r.y)); };

export default function () {
  const a = new Armor('humanoid');
  // ── 투구: 벨벳 두건(옆·뒤·위) + 정면 도자기 가면
  fill(a, 'head', F6, VEL, damask(2.6));
  for (const f of ['east', 'west', 'south']) a.draw('head', f, (c, r) => { c.vline(r.x + 2, r.y + 2, r.y + 7, VEL[1]); c.vline(r.x + 5, r.y + 3, r.y + 7, VEL[1]); c.hline(r.x, r.x + r.w - 1, r.y + r.h - 1, ECT[3]); }); // 접힌 주름 + 민트 솔기
  a.chars('head', 'north', 0, 0, [
    'hHHHHHHh',
    'hiWWWWih',
    'hIiIIiIh',
    'hEeIIeEh',
    'hIIcIIIh',
    'hIIIcIih',
    'hiImmIih',
    'hhiIIihh',
  ], { h: VEL[2], H: VEL[4], W: IVO[5], I: IVO[4], i: IVO[3], c: IVO[1], E: ECT[6], e: ECT[4], m: ECT[2] });
  // ── 흉갑: 벨벳 연미복 + 옷깃(어두운 사선, 민트 솔기) + 크라바트 + 회색 조끼와 단추
  fill(a, 'body', F6, VEL, damask(2.5));
  a.chars('body', 'north', 0, 0, [
    'vgWWWWgv',
    'vvgWeWgv',
    '.vvgWgvv',
    '..vpppv.',
    '..gpPpg.',
    '..vpppv.',
    '..gpPpg.',
    '..vpppv.',
    '..gpPpg.',
    '...ppp..',
    '........',
    'gggggggg',
  ].map(r => r.replace(/\./g, '.')), { v: VEL[1], g: ECT[3], W: IVO[5], e: ECT[6], p: PEW[3], P: PEW[6] });
  a.draw('body', 'south', (c, r) => { c.vline(r.x + 3, r.y + 7, r.y + 11, VEL[0]); c.vline(r.x + 4, r.y + 7, r.y + 11, VEL[0]); c.set(r.x + 2, r.y + 6, PEW[6]); c.set(r.x + 5, r.y + 6, PEW[6]); c.hline(r.x, r.x + r.w - 1, r.y, ECT[3]); }); // 연미복 꼬리 트임 + 허리 단추
  // ── 어깨 망토(팔 위 6줄): 벨벳 + 백랍 위 테 + 민트 아래 테
  fill(a, 'arm_r', [...F4, 'up'], VEL, damask(2.8));
  for (const f of F4) a.draw('arm_r', f, (c, r) => { c.hline(r.x, r.x + r.w - 1, r.y, PEW[5]); c.hline(r.x, r.x + r.w - 1, r.y + 5, ECT[3]); c.hline(r.x, r.x + r.w - 1, r.y + 4, VEL[1]); });
  a.keepRows('arm_r', 0, 6); a.draw('arm_r', 'down', (c, r) => c.rect(r.x, r.y, r.w, r.h, null));
  // ── 구두(다리 아래 4줄): 마호가니 가죽 + 백랍 버클 + 밝은 앞코
  fill(a, 'leg_r', [...F4, 'down'], MAH, () => 2.6, { rim: false });
  for (const f of F4) a.draw('leg_r', f, (c, r) => { c.hline(r.x, r.x + r.w - 1, r.y + 8, VEL[2]); });
  a.draw('leg_r', 'north', (c, r) => { c.rect(r.x + 1, r.y + 9, 2, 2, PEW[5]); c.set(r.x + 1, r.y + 9, PEW[6]); c.set(r.x + 2, r.y + 10, PEW[2]); c.hline(r.x, r.x + r.w - 1, r.y + 11, MAH[5]); });
  a.keepRows('leg_r', 8, 12);

  const l = new Armor('humanoid_leggings');
  // ── 허리(몸 아래 5줄): 벨벳 + 백랍 벨트 + 열쇠고리(오른쪽 옆)
  fill(l, 'body', F4, VEL, damask(2.2));
  for (const f of F4) l.draw('body', f, (c, r) => { c.hline(r.x, r.x + r.w - 1, r.y + 7, PEW[4]); c.hline(r.x, r.x + r.w - 1, r.y + 8, PEW[2]); });
  l.draw('body', 'north', (c, r) => { c.rect(r.x + 3, r.y + 7, 2, 2, PEW[6]); c.set(r.x + 6, r.y + 9, PEW[5]); c.set(r.x + 6, r.y + 10, PEW[4]); c.set(r.x + 7, r.y + 10, PEW[3]); c.set(r.x + 6, r.y + 11, PEW[4]); });
  l.keepRows('body', 7, 12);
  // ── 바지(다리 위 10줄): 짙은 줄무늬 벨벳 → 정강이(6~9행)부터 민트 엑토플라즘으로 디더 소멸
  for (const f of F4) l.draw('leg_r', f, (c, r) => {
    for (let y = 0; y < 10; y++) for (let x = 0; x < r.w; x++) {
      const stripe = x % 2 === 0 ? VEL[2] : VEL[1];
      if (y < 6) { c.set(r.x + x, r.y + y, y === 0 ? VEL[3] : stripe); continue; }
      const k = (x * 3 + y * 5 + (f === 'east' ? 1 : 0)) % 4;      // 아래로 갈수록 엑토플라즘 비율 증가, 9행은 듬성듬성(해진 밑단)
      const ecto = y - 5;
      if (y === 9 && k % 2) { c.set(r.x + x, r.y + y, null); continue; }
      c.set(r.x + x, r.y + y, k < ecto ? ECT[ecto >= 3 ? 4 : 3] : stripe);
    }
  });
  l.draw('leg_r', 'up', (c, r) => c.rect(r.x, r.y, r.w, r.h, VEL[2]));
  l.keepRows('leg_r', 0, 10);

  return { humanoid: a.canvas, leggings: l.canvas, icons: icons() };
}

/** 아이콘 4종(16×16): 모델과 같은 팔레트·같은 특징(가면 눈구멍, 크라바트와 민트 핀, 흩어지는 바지 밑단, 버클) — 외곽선은 자동 */
export function icons() {
  const L = { h: VEL[2], H: VEL[4], v: VEL[1], V: VEL[3], W: IVO[5], I: IVO[4], i: IVO[3], c: IVO[1], E: ECT[6], e: ECT[4], g: ECT[3], p: PEW[3], P: PEW[6], m: MAH[3], M: MAH[5] };
  const draw = rows => outline(new PixelCanvas(16).chars(0, 0, rows, L), OUT);
  return {
    helmet: draw([
      '................',
      '.....hhhhhh.....',
      '....hHHHHHHh....',
      '...hHhhhhhhHh...',
      '...hhWWWWWWhh...',
      '...hiIIIIIIih...',
      '...hIEeIIeEIh...',
      '...hIIIcIIIIh...',
      '...hIIIIcIiIh...',
      '...hiIIggIIih...',
      '...hhiIIIIihh...',
      '....hhhiihhh....',
      '.....h....h.....',
      '................',
      '................',
      '................']),
    chestplate: draw([
      '................',
      '..hhhh....hhhh..',
      '.hHVVhhWWhhVVhh.',
      '.hVVVvgWWgvVVVh.',
      '.hVhhvvgegvvhVh.',
      '.hh.hVvpppvVh.h.',
      '....hVgpPpgVh...',
      '....hVvpppvVh...',
      '....hVgpPpgVh...',
      '....hVvpppvVh...',
      '....hVVvvvVVh...',
      '....hggggggggh..',
      '................',
      '................',
      '................',
      '................'].map(r => r.slice(0, 16))),
    leggings: draw([
      '................',
      '................',
      '....pppppppp....',
      '....pPpppppp....',
      '....hVhVhVhV....',
      '....hVhVhVhV....',
      '....hVh..hVh....',
      '....hVh..hVh....',
      '....hgh..hgh....',
      '....ghg..ghg....',
      '....g.e..g.e....',
      '.....g....g.....',
      '................',
      '................',
      '................',
      '................']),
    boots: draw([
      '................',
      '................',
      '................',
      '................',
      '................',
      '..hhh....hhh....',
      '..mmm....mmm....',
      '..mmm....mmm....',
      '..mPp....mPp....',
      '..mmmm...mmmm...',
      '..MMMMm..MMMMm..',
      '................',
      '................',
      '................',
      '................',
      '................']),
  };
}
