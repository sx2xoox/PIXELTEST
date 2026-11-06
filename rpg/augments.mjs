// 증강 야생전 — 증강체 아이콘(사용자 서버의 카드 UI 기준)
//  참고 화면에서 읽은 문법: 원형 메달 안 32px 픽셀 그림 = 주제 하나(칼+왕관, 거인, 날개, 유령)
//   + 오른쪽 아래 분류 배지(전투 빨강 ✕ · 양날의 검 보라 ± · 기동 파랑 ⌃). 2~4톤 평면 명암, 얇은 어두운 외곽선, 빛은 왼쪽 위.
//  여기서는 같은 문법으로 새 증강 6종 + 배지 2종(방어 초록 ✚ · 자원 금 ◆)을 만든다.
//   node rpg/augments.mjs → rpg/out/augments/ (아이콘 32×32 PNG, 리소스팩, 카드 미리보기 HTML)
import fs from 'fs';
import { PixelCanvas } from '../atelier/pixel.js';
import { oklch } from '../atelier/color.js';

const N = 32, INK = '#14101e';
// 4단 램프(어둠 → 밝음): 왼쪽 위 빛
const ramp = (h, c, lo = 0.42, hi = 0.9) => [0, 1, 2, 3].map(i => oklch(lo + ((hi - lo) * i) / 3, c * (i === 3 ? 0.6 : 1), (h + (i - 1.5) * 6 + 360) % 360));
const RAMP = {
  gold: ramp(88, 0.16, 0.55, 0.95), red: ramp(25, 0.2, 0.4, 0.8), white: ramp(250, 0.02, 0.62, 0.98), iron: ramp(250, 0.03, 0.45, 0.88),
  orange: ramp(55, 0.19, 0.55, 0.93), bone: ramp(80, 0.035, 0.6, 0.95), leather: ramp(50, 0.08, 0.35, 0.68), wine: ramp(10, 0.15, 0.3, 0.55),
  cyan: ramp(200, 0.12, 0.65, 0.95),
};
/** 부품 하나: 모양을 그려 → 자동 음영(왼쪽 위 빛) → 얇은 외곽선 → 아이콘에 얹기 */
function part(icon, draw, R, { outline = INK, flat = false } = {}) {
  const l = new PixelCanvas(N, N);
  draw(l, '#ffffff');
  const m = l.mask();
  if (flat) l.each((x, y) => m[y * N + x] && l.set(x, y, R));
  else l.autoShade(m, R, { light: [-1, -1], radius: 4, ambient: 0.4 });
  if (outline) l.outline(outline);
  icon.paste(l);
}
const heart = (c, col, cx, cy, s) => { c.ellipse(cx - s * 0.5, cy - s * 0.15, s * 0.55, s * 0.55, col); c.ellipse(cx + s * 0.5, cy - s * 0.15, s * 0.55, s * 0.55, col); c.poly([[cx - s * 1.05, cy], [cx + s * 1.05, cy], [cx, cy + s * 1.15]], col); };

// 분류 배지(오른쪽 아래, 지름 11): 원판 + 한 단 어두운 테 + 흰 기호
export const BADGES = {
  combat: { ko: '전투', hue: 25, sym: ['x...x', '.x.x.', '..x..', '.x.x.', 'x...x'] },
  gamble: { ko: '양날의 검', hue: 305, sym: ['..x..', 'xxxxx', '..x..', '.....', 'xxxxx'] },
  move: { ko: '기동', hue: 235, sym: ['.....', '..x..', '.x.x.', 'x...x', '.....'] },
  guard: { ko: '방어', hue: 150, sym: ['..x..', '..x..', 'xxxxx', '..x..', '..x..'] },
  loot: { ko: '자원', hue: 88, sym: ['..x..', '.xxx.', 'xxxxx', '.xxx.', '..x..'] },
};
function badge(icon, kind) {
  const B = BADGES[kind], cx = 26, cy = 26;
  for (let y = 20; y < 32; y++) for (let x = 20; x < 32; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d <= 6.2) icon.set(x, y, d > 5.2 ? INK : d > 4.3 ? oklch(0.42, 0.14, B.hue) : oklch(0.6 + (cy - y) * 0.015, 0.17, B.hue));
  }
  B.sym.forEach((r, j) => [...r].forEach((ch, i) => ch === 'x' && icon.set(24 + i, 24 + j, '#ffffff')));
}

// 16×16 원본(처음 시연: 등급 테두리 + 가운데 문양) — 인벤토리·채팅용 작은 아이콘으로 그대로 둔다
const FRAME16 = ['................', '..oooooooooooo..', '.o444444444432o.', '.o4BBBBBBBBBB2o.', '.o4bbbbbbbbbb2o.', '.o4bbbbbbbbbb2o.', '.o3bbbbbbbbbb1o.', '.o3bbbbbbbbbb1o.', '.o3bbbbbbbbbb1o.', '.o3bbbbbbbbbb1o.', '.o3bbbbbbbbbb1o.', '.o3bbbbbbbbbb1o.', '.o3bbbbbbbbbb1o.', '.o322222222211o.', '..oooooooooooo..', '................'];
const GLYPH16 = {
  flame: ['....k.....', '...k4k....', '...k43k.k.', '..k343kk4k', '.k34443k3k', '.k344443k.', 'k34444432k', 'k23444322k', '.k223322k.', '..kkkkkk..'],
  feather: ['........kk', '.......k4k', '......k44k', '.....k443k', '....k4432k', '...k4432k.', '..k4432k..', '.k4432k...', '.k33kk....', 'k1k.......'],
  pickaxe: ['..kkkkkk..', '.k444433k.', 'k4kkkk1k3k', 'kk..k1k.kk', '...k1k....', '..k1k.....', '.k1k......', 'k1k.......', 'kk........', '..........'],   // v2: T자로 읽혀 32px처럼 대각선 자루로
  drop: ['....kk....', '...k33k...', '...k43k...', '..k4433k..', '.k443332k.', 'k44333322k', 'k43333222k', 'k33322221k', '.k322221k.', '..kkkkkk..'],
  bolt: ['.....kkkk.', '....k444k.', '...k443k..', '..k443k...', '.k4444443k', '.kkkk443k.', '....k43k..', '...k43k...', '..k32k....', '..kkk.....'],
  shield: ['kkkkkkkkkk', 'k44444332k', 'k44334321k', 'k43344321k', 'k43343221k', 'k33343221k', '.k333221k.', '..k3221k..', '...k21k...', '....kk....'],
  heart: ['..........', '.kkk..kkk.', 'k443kk332k', 'k44433332k', 'k44333322k', 'k43333222k', '.k333222k.', '..k3322k..', '...k32k...', '....kk....'],
  hourglass: ['kkkkkkkkkk', '.k444443k.', '..k4443k..', '...k43k...', '....kk....', '...k13k...', '..k1233k..', '.k123443k.', '.k234443k.', 'kkkkkkkkkk'],
  eye: ['..........', '..........', '...kkkk...', '.kk4444kk.', 'k443kk332k', 'k432kk222k', '.kk3222kk.', '...kkkk...', '..........', '..........'],
};
const GRAMP = { flame: RAMP.orange, feather: RAMP.white, pickaxe: RAMP.iron, drop: RAMP.red, bolt: RAMP.gold, shield: ramp(255, 0.14, 0.4, 0.85), heart: RAMP.red, hourglass: RAMP.gold, eye: ramp(175, 0.14, 0.45, 0.92) };
// 등급: 16px 테두리 램프 · 카드 테두리 그라디언트 · 메달 테 색
export const TIERS = {
  silver: { ko: '실버', ramp: ramp(250, 0.02, 0.5, 0.95), card: '#9aa3b5,#e4e9f2,#9aa3b5', ring: '#b8c0cf', spoke: '#8a93a6' },
  gold: { ko: '골드', ramp: ramp(85, 0.15, 0.48, 0.92), card: '#b88a2a,#ffe08a,#c9962e', ring: '#e8b84a', spoke: '#b88a2a' },
  prism: { ko: '프리즘', ramp: null, card: '#7fe0e6,#b48cf0,#f29ac0', ring: '#9b7cf0', spoke: '#7a5fd0' },
};
export function icon16(a) {
  const T = TIERS[a.tier], c = new PixelCanvas(16);
  FRAME16.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    if (ch === 'b' || ch === 'B') return c.set(x, y, ch === 'b' ? '#1b1630' : '#2a2348');
    if (ch === 'o') return c.set(x, y, INK);
    const k = +ch - 1;
    c.set(x, y, T.ramp ? T.ramp[k] : oklch(0.55 + k * 0.1, 0.19, ((Math.atan2(y - 7.5, x - 7.5) * 180) / Math.PI + 560) % 360));
  }));
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) if (a.tier !== 'silver') c.set(x, y, a.tier === 'gold' ? T.ramp[3] : '#fff6e2');
  const G = GRAMP[a.glyph];
  GLYPH16[a.glyph].forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') c.set(3 + x, 3 + y, ch === 'k' ? INK : G[+ch - 1]); }));
  return c;
}

// 32px 카드 그림: 16px 문양을 "주제 그림 + 분류 배지"로 확장(참고 화면 문법)
export const AUGMENTS = [
  {
    id: 'auto_smelt', name: '자동 제련', tier: 'silver', glyph: 'flame', badge: 'loot', desc: ['캐낸 광석이 바로', '주괴로 떨어집니다.'],
    draw: ic => {
      part(ic, (c, w) => { c.poly([[5, 30], [9, 18], [12, 23], [15, 14], [19, 22], [22, 17], [26, 30]], w); }, RAMP.orange);
      part(ic, (c, w) => c.poly([[12, 23], [15, 18], [18, 24], [16, 30], [13, 30]], w), [RAMP.gold[2], RAMP.gold[3], '#fff6d8', '#ffffff'], { outline: null });
      part(ic, (c, w) => { c.poly([[6, 10], [12, 4], [27, 4], [21, 10]], w); c.rect(6, 10, 15, 4, w); c.poly([[21, 10], [27, 4], [27, 8], [21, 14]], w); }, RAMP.iron);
    },
  },
  {
    id: 'feather_fall', name: '깃털 낙하', tier: 'silver', glyph: 'feather', badge: 'move', desc: ['낙하 피해를', '받지 않습니다.'],
    draw: ic => {
      // 깃털: 대각선 깃대를 따라 양쪽으로 부푼 깃(아래쪽은 갈라진 결 2곳)
      part(ic, (c, w) => c.poly([[26, 2], [29, 5], [22, 18], [13, 26], [7, 28], [8, 23], [12, 16], [20, 7]], w), RAMP.white);
      part(ic, (c, w) => { c.line(27, 3, 6, 29, w); }, RAMP.iron[0], { flat: true, outline: null });
      part(ic, (c, w) => { c.line(4, 27, 2, 31, w); c.line(5, 27, 3, 31, w); }, RAMP.leather[1], { flat: true, outline: null });
      for (const [x, y] of [[11, 20], [17, 14]]) { ic.set(x, y, INK); ic.set(x + 1, y + 1, INK); }
      for (const [x0, y0] of [[2, 9], [4, 14]]) ic.hline(x0, x0 + 4, y0, RAMP.cyan[2]);
    },
  },
  {
    id: 'miners_hand', name: '광부의 손', tier: 'silver', glyph: 'pickaxe', badge: 'loot', desc: ['채굴 속도가', '25% 빨라집니다.'],
    draw: ic => {
      part(ic, (c, w) => { for (let i = 0; i < 3; i++) c.line(4 + i, 29, 21 + i, 12, w); }, RAMP.leather);
      part(ic, (c, w) => c.poly([[5, 9], [11, 4], [19, 3], [27, 6], [30, 12], [28, 13], [24, 9], [18, 8], [12, 9], [7, 12]], w), RAMP.iron);
      for (const [x, y] of [[4, 4], [28, 1]]) { ic.set(x, y, RAMP.cyan[3]); ic.set(x - 1, y, RAMP.cyan[2]); ic.set(x + 1, y, RAMP.cyan[2]); ic.set(x, y - 1, RAMP.cyan[2]); ic.set(x, y + 1, RAMP.cyan[2]); }
    },
  },
  {
    id: 'bloodthirst', name: '흡혈', tier: 'gold', glyph: 'drop', badge: 'combat', desc: ['입힌 피해의 8%만큼', '체력을 회복합니다.'],
    draw: ic => {
      part(ic, (c, w) => { c.ellipse(15, 19, 10, 10, w); c.poly([[7, 14], [15, 1], [23, 14]], w); }, RAMP.red);
      part(ic, (c, w) => { c.hline(9, 21, 19, w); c.set(8, 18, w); c.set(22, 18, w); }, RAMP.wine[0], { flat: true, outline: null });
      part(ic, (c, w) => { c.poly([[10, 20], [13, 20], [11.5, 25]], w); c.poly([[17, 20], [20, 20], [18.5, 25]], w); }, RAMP.white, { outline: RAMP.wine[0] });
      ic.set(10, 9, RAMP.red[3]); ic.set(11, 8, RAMP.red[3]);
    },
  },
  {
    id: 'chain_lightning', name: '연쇄 번개', tier: 'gold', glyph: 'bolt', badge: 'combat', desc: ['4번째 근접 공격마다 대상과', '주변 적 2명에게 번개가 떨어집니다.'],
    draw: ic => {
      part(ic, (c, w) => c.poly([[19, 1], [7, 17], [14, 17], [9, 31], [25, 12], [17, 12], [23, 1]], w), RAMP.gold);
      for (const [x, y] of [[4, 6], [27, 18], [3, 24]]) part(ic, (c, w) => { c.set(x, y, w); c.set(x - 1, y, w); c.set(x + 1, y, w); c.set(x, y - 1, w); c.set(x, y + 1, w); }, RAMP.cyan[3], { flat: true, outline: null });
    },
  },
  {
    id: 'iron_skin', name: '강철 피부', tier: 'gold', glyph: 'shield', badge: 'guard', desc: ['방어력 +4,', '넉백 저항 +20%.'],
    draw: ic => {
      part(ic, (c, w) => c.poly([[5, 3], [27, 3], [27, 15], [22, 23], [16, 29], [10, 23], [5, 15]], w), RAMP.iron);
      part(ic, (c, w) => { c.rect(14, 6, 4, 19, w); c.rect(8, 11, 16, 4, w); }, ramp(255, 0.14, 0.4, 0.8), { outline: null });
      part(ic, (c, w) => c.ellipse(16, 13, 2.6, 2.6, w), RAMP.gold);
      ic.hline(6, 26, 4, RAMP.iron[3]);
    },
  },
  {
    id: 'second_heart', name: '두 번째 심장', tier: 'prism', glyph: 'heart', badge: 'guard', desc: ['한 번 죽음을 피하고', '체력 50%로 되살아납니다.'],
    draw: ic => {
      part(ic, (c, w) => heart(c, w, 22, 9, 5.2), ramp(15, 0.13, 0.4, 0.72));
      part(ic, (c, w) => heart(c, w, 13, 16, 8.4), RAMP.red);
      ic.set(8, 12, '#ffffff'); ic.set(9, 11, '#ffffff'); ic.set(8, 13, RAMP.red[3]);
    },
  },
  {
    id: 'time_warp', name: '시간 왜곡', tier: 'prism', glyph: 'hourglass', badge: 'move', desc: ['모든 재사용 대기시간 -30%.', '엔더 진주 대기시간 없음.'],
    draw: ic => {
      // 모래시계: 금 받침 2개 + 유리(밝은 하늘, 속 비침) + 아래로 쌓인 모래와 가는 줄기
      part(ic, (c, w) => { c.poly([[8, 5], [24, 5], [17, 16], [24, 27], [8, 27], [15, 16]], w); }, [RAMP.cyan[0], RAMP.cyan[1], RAMP.cyan[2], RAMP.cyan[3]]);
      part(ic, (c, w) => { c.poly([[10, 7], [22, 7], [17, 12], [15, 12]], w); c.poly([[11, 25], [21, 25], [19, 21], [13, 21]], w); c.vline(16, 13, 21, w); }, RAMP.gold, { outline: null });
      part(ic, (c, w) => { c.rect(5, 2, 22, 3, w); c.rect(5, 27, 22, 3, w); }, RAMP.leather);
      ic.vline(10, 8, 12, '#ffffff');
    },
  },
  {
    id: 'vein_sight', name: '광맥의 눈', tier: 'prism', glyph: 'eye', badge: 'loot', desc: ['8칸 안의 광석이', '벽 너머로 빛나 보입니다.'],
    draw: ic => {
      part(ic, (c, w) => c.ellipse(16, 15, 13, 8, w), RAMP.white);
      part(ic, (c, w) => c.ellipse(16, 15, 6, 6, w), ramp(175, 0.14, 0.42, 0.9));
      part(ic, (c, w) => { c.poly([[16, 11], [19, 15], [16, 19], [13, 15]], w); }, ramp(200, 0.12, 0.7, 0.98), { outline: INK });
      ic.set(13, 12, '#ffffff'); ic.set(12, 13, '#ffffff');
      for (const [x0, y0, x1, y1] of [[16, 1, 16, 4], [5, 4, 7, 6], [27, 4, 25, 6]]) ic.line(x0, y0, x1, y1, RAMP.gold[2]);
    },
  },
];

export function augmentIcon(a) { const ic = new PixelCanvas(N, N); a.draw(ic); badge(ic, a.badge); return ic; }

// ── 출력
const OUT = 'rpg/out/augments';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const items = AUGMENTS.map(a => ({ ...a, icon: augmentIcon(a), small: icon16(a) }));
items.forEach(a => { fs.writeFileSync(`${OUT}/${a.id}.png`, a.icon.toPNG()); fs.writeFileSync(`${OUT}/${a.id}_16.png`, a.small.toPNG()); });
// 16 → 32 확장 시트: 각 칸 [16px 원본(2배) | 32px 카드 그림]
const sheet = new PixelCanvas(3 * 74, 3 * 36); sheet.fill('#1c1a33');
items.forEach((a, i) => { const x = (i % 3) * 74, y = ((i / 3) | 0) * 36; sheet.paste(a.small.scale(2), x + 2, y + 2); sheet.paste(a.icon, x + 38, y + 2); });
fs.writeFileSync(`${OUT}/sheet.png`, sheet.scale(4).toPNG());

const card = a => { const T = TIERS[a.tier]; return `<div class="card" style="border-image:linear-gradient(135deg,${T.card}) 1"><div class="tier" style="color:${T.ring}">${T.ko}</div><div class="med"><svg viewBox="0 0 120 120">${Array.from({ length: 16 }, (_, i) => { const t = (i / 16) * Math.PI * 2; return `<line x1="${60 + Math.cos(t) * 54}" y1="${60 + Math.sin(t) * 54}" x2="${60 + Math.cos(t) * 60}" y2="${60 + Math.sin(t) * 60}" stroke="${T.spoke}" stroke-width="2"/>`; }).join('')}<circle cx="60" cy="60" r="48" fill="#1e1a36" stroke="${T.ring}" stroke-width="5"/></svg><img src="${a.icon.toDataURL()}"></div>
<div class="nm" style="border-color:${T.spoke}"><img class="sm" src="${a.small.toDataURL()}">${a.name}</div><div class="cat" style="color:${oklch(0.75, 0.15, BADGES[a.badge].hue)}">◆ ${BADGES[a.badge].ko}</div><div class="ds">${a.desc.join('<br>')}</div></div>`; };
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Augment Icons</title><style>
body{margin:0;background:#5d7f3e;font-family:Unifont,monospace;padding:28px}
.row{display:flex;gap:22px;margin-bottom:22px}
.card{width:280px;background:#1a1730;border:4px solid;padding:10px 16px 20px;color:#fff;text-align:center}
.tier{font-size:16px;text-align:left}
.med{position:relative;width:150px;height:150px;margin:0 auto}.med svg{position:absolute;inset:0}.med img{position:absolute;left:27px;top:27px;width:96px;height:96px;image-rendering:pixelated}
.nm{font-size:22px;margin:12px 0 10px;padding:6px 0;border-top:2px solid;border-bottom:2px solid;display:flex;gap:8px;align-items:center;justify-content:center}
.sm{width:32px;height:32px;image-rendering:pixelated}
.cat{font-size:18px;margin-bottom:4px}.ds{font-size:18px;line-height:26px;color:#e8e6f4}
</style></head><body>${['silver', 'gold', 'prism'].map(t => `<div class="row">${items.filter(a => a.tier === t).map(card).join('')}</div>`).join('')}</body></html>`;
fs.writeFileSync(`${OUT}/preview.html`, html);
console.log('augments', items.length);
