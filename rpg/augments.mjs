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

export const AUGMENTS = [
  {
    id: 'chain_lightning', name: '연쇄 번개', badge: 'combat', desc: ['4번째 근접 공격마다 대상과', '주변 적 2명에게 번개가 떨어집니다.'],
    draw: ic => {
      part(ic, (c, w) => c.poly([[19, 1], [7, 17], [14, 17], [9, 31], [25, 12], [17, 12], [23, 1]], w), RAMP.gold);
      for (const [x, y] of [[4, 6], [27, 18], [3, 24]]) part(ic, (c, w) => { c.set(x, y, w); c.set(x - 1, y, w); c.set(x + 1, y, w); c.set(x, y - 1, w); c.set(x, y + 1, w); }, RAMP.cyan[3], { flat: true, outline: null });
    },
  },
  {
    id: 'bloodthirst', name: '흡혈', badge: 'combat', desc: ['입힌 피해의 8%만큼', '체력을 회복합니다.'],
    draw: ic => {
      part(ic, (c, w) => { c.ellipse(15, 19, 10, 10, w); c.poly([[7, 14], [15, 1], [23, 14]], w); }, RAMP.red);
      // 송곳니 입: 어두운 입 선 + 아래로 향한 흰 송곳니 둘(처음엔 이빨만 있어 눈물처럼 보였다)
      part(ic, (c, w) => { c.hline(9, 21, 19, w); c.set(8, 18, w); c.set(22, 18, w); }, RAMP.wine[0], { flat: true, outline: null });
      part(ic, (c, w) => { c.poly([[10, 20], [13, 20], [11.5, 25]], w); c.poly([[17, 20], [20, 20], [18.5, 25]], w); }, RAMP.white, { outline: RAMP.wine[0] });
      ic.set(10, 9, RAMP.red[3]); ic.set(11, 8, RAMP.red[3]);
    },
  },
  {
    id: 'auto_smelt', name: '자동 제련', badge: 'loot', desc: ['캐낸 광석이 바로', '주괴로 떨어집니다.'],
    draw: ic => {
      part(ic, (c, w) => { c.poly([[5, 30], [9, 18], [12, 23], [15, 14], [19, 22], [22, 17], [26, 30]], w); }, RAMP.orange);
      part(ic, (c, w) => c.poly([[12, 23], [15, 18], [18, 24], [16, 30], [13, 30]], w), [RAMP.gold[2], RAMP.gold[3], '#fff6d8', '#ffffff'], { outline: null });
      part(ic, (c, w) => { c.poly([[6, 10], [12, 4], [27, 4], [21, 10]], w); c.rect(6, 10, 15, 4, w); c.poly([[21, 10], [27, 4], [27, 8], [21, 14]], w); }, RAMP.iron);
    },
  },
  {
    id: 'second_heart', name: '두 번째 심장', badge: 'guard', desc: ['한 번 죽음을 피하고', '체력 50%로 되살아납니다.', '(이후 사라짐)'],
    draw: ic => {
      part(ic, (c, w) => heart(c, w, 22, 9, 5.2), ramp(15, 0.13, 0.4, 0.72));
      part(ic, (c, w) => heart(c, w, 13, 16, 8.4), RAMP.red);
      ic.set(8, 12, '#ffffff'); ic.set(9, 11, '#ffffff'); ic.set(8, 13, RAMP.red[3]);
    },
  },
  {
    id: 'berserk', name: '광폭화', badge: 'gamble', desc: ['공격력이 25% 늘어나는 대신', '받는 피해도 15% 늘어납니다.'],
    draw: ic => {
      part(ic, (c, w) => { c.poly([[6, 12], [2, 3], [5, 2], [10, 9]], w); c.poly([[25, 12], [29, 3], [26, 2], [21, 9]], w); }, RAMP.red);
      part(ic, (c, w) => { c.ellipse(15.5, 14, 9, 8.5, w); c.rect(10, 19, 12, 7, w); }, RAMP.bone);
      part(ic, (c, w) => { c.ellipse(12, 14.5, 2.4, 2.6, w); c.ellipse(19, 14.5, 2.4, 2.6, w); c.poly([[15.5, 18], [14, 21], [17, 21]], w); }, INK, { flat: true, outline: null });
      ic.set(12, 14, '#ff4b3e'); ic.set(19, 14, '#ff4b3e');
      for (const x of [12, 15, 18]) ic.vline(x, 22, 25, RAMP.bone[0]);
    },
  },
  {
    id: 'gale_boots', name: '질풍', badge: 'move', desc: ['이동 속도 +15%.', '전투 중이 아닐 때 +30%.'],
    draw: ic => {
      // 날개: 장화 목 뒤에서 왼쪽 위로 퍼지는 깃털 3장(처음엔 평행 사각형이라 톱날처럼 보였다)
      part(ic, (c, w) => { c.poly([[13, 9], [4, 1], [1, 4], [12, 12]], w); c.poly([[13, 12], [1, 8], [1, 12], [12, 15]], w); c.poly([[13, 15], [2, 15], [4, 19], [12, 17]], w); }, RAMP.white);
      part(ic, (c, w) => { c.rect(13, 6, 8, 15, w); c.poly([[13, 20], [25, 20], [29, 23], [29, 26], [13, 26]], w); }, RAMP.leather);
      part(ic, (c, w) => c.rect(13, 6, 8, 3, w), RAMP.gold, { outline: null });
      ic.hline(13, 28, 25, RAMP.leather[0]);
    },
  },
];

export function augmentIcon(a) { const ic = new PixelCanvas(N, N); a.draw(ic); badge(ic, a.badge); return ic; }

// ── 출력
const OUT = 'rpg/out/augments';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const items = AUGMENTS.map(a => ({ ...a, icon: augmentIcon(a) }));
items.forEach(a => fs.writeFileSync(`${OUT}/${a.id}.png`, a.icon.toPNG()));
const sheet = new PixelCanvas(items.length * 36, 36); sheet.fill('#1c1a33');
items.forEach((a, i) => sheet.paste(a.icon, i * 36 + 2, 2));
fs.writeFileSync(`${OUT}/sheet.png`, sheet.scale(6).toPNG());

// 카드 미리보기: 참고 화면의 메달(보라 원 + 바깥 짧은 살) 안에 32px 아이콘을 3배로 — 크기·배지 위치가 맞는지 확인용
const card = a => `<div class="card"><div class="med"><svg viewBox="0 0 120 120">${Array.from({ length: 16 }, (_, i) => { const t = (i / 16) * Math.PI * 2; return `<line x1="${60 + Math.cos(t) * 54}" y1="${60 + Math.sin(t) * 54}" x2="${60 + Math.cos(t) * 60}" y2="${60 + Math.sin(t) * 60}" stroke="#7a5fd0" stroke-width="2"/>`; }).join('')}<circle cx="60" cy="60" r="48" fill="#1e1a36" stroke="#9b7cf0" stroke-width="5"/></svg><img src="${a.icon.toDataURL()}"></div>
<div class="nm">${a.name}</div><div class="cat" style="color:${oklch(0.75, 0.15, BADGES[a.badge].hue)}">◆ ${BADGES[a.badge].ko}</div><div class="ds">${a.desc.join('<br>')}</div></div>`;
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Augment Icons</title><style>
body{margin:0;background:#5d7f3e;font-family:Unifont,monospace;padding:28px}
.row{display:flex;gap:22px;flex-wrap:wrap}
.card{width:300px;background:#1a1730;border:4px solid #7fe0e6;border-image:linear-gradient(135deg,#7fe0e6,#b48cf0,#f29ac0) 1;padding:18px 16px 22px;color:#fff;text-align:center}
.med{position:relative;width:150px;height:150px;margin:0 auto}.med svg{position:absolute;inset:0}.med img{position:absolute;left:27px;top:27px;width:96px;height:96px;image-rendering:pixelated}
.nm{font-size:22px;margin:14px 0 10px;padding:6px 0;border-top:2px solid #7a5fd0;border-bottom:2px solid #7a5fd0}
.cat{font-size:18px;margin-bottom:4px}.ds{font-size:18px;line-height:26px;color:#e8e6f4}
</style></head><body><div class="row">${items.map(card).join('')}</div></body></html>`;
fs.writeFileSync(`${OUT}/preview.html`, html);
console.log('augments', items.length);
