// 2D 픽셀아트(아이템 스프라이트·블록 텍스처) 비평 + 검수 시트
import { browser } from '../render.js';
import { seamScore } from './materials.js';
import { hexToOklch } from '../color.js';

export function critiqueSprite(c, { kind = 'item', tile = 'xy' } = {}) {
  const issues = [];
  const add = (severity, code, msg, fix) => issues.push({ severity, code, msg, fix });
  const cols = c.colors();
  const n = cols.size;
  const L = hex => hexToOklch(hex).L;
  if (![16, 32, 64].includes(c.w) || c.w !== c.h) add('warn', 'size', `${c.w}×${c.h} → 바닐라 감각은 16×16(고해상도 팩이면 32/64)`, '정사각 16의 배수로 맞추세요.');
  if (n > (kind === 'item' ? 20 : 14)) add('warn', 'colors', `색 ${n}개 → 많음`, kind === 'item' ? '재질당 3~5단계 램프로 줄이세요.' : '블록은 한 램프 4~6색 + 포인트 1~2색.');
  if (n < 3) add('warn', 'colors-few', `색 ${n}개 → 평면적`, '최소 3단계 명암 램프를 쓰세요.');

  let opaque = 0, orphan = 0, lumSum = 0, lumSq = 0;
  let minX = c.w, minY = c.h, maxX = -1, maxY = -1;
  c.each((x, y) => {
    const v = c.get(x, y);
    if (!v) return;
    opaque++;
    const l = L(v); lumSum += l; lumSq += l * l;
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => c.get(x + dx, y + dy)).filter(Boolean);
    // 대각선으로 같은 색이 이어지면(45° 선) 고립이 아니다
    const diagSame = [[1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => c.get(x + dx, y + dy) === v);
    if (nb.length >= 3 && !diagSame && nb.every(o => o !== v && Math.abs(L(o) - l) > 0.12)) orphan++;
  });
  const mean = lumSum / Math.max(1, opaque);
  const std = Math.sqrt(Math.max(0, lumSq / Math.max(1, opaque) - mean * mean));
  if (std < 0.05) add('warn', 'muddy', `명도 표준편차 ${std.toFixed(3)} → 흐릿함`, '가장 밝은 하이라이트와 가장 어두운 그림자를 확실히 넣으세요.');
  if (kind === 'item') {
    if (opaque && orphan / opaque > 0.05) add('warn', 'orphans', `고립 픽셀 ${orphan}개(${((orphan / opaque) * 100).toFixed(0)}%) → 지저분함`, '1px 점은 의도한 반짝임(하이라이트)만 남기세요.');
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    if (Math.max(bw, bh) < c.w * 0.7) add('info', 'small', `실루엣 ${bw}×${bh} → 손에 들었을 때 작아 보임`, '캔버스를 75% 이상 쓰세요(대각선 배치 활용).');
    // 외곽선: 가장자리 픽셀이 내부보다 어두운가
    let edge = 0, dark = 0;
    c.each((x, y) => {
      const v = c.get(x, y);
      if (!v) return;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !c.get(x + dx, y + dy))) { edge++; if (L(v) < mean - 0.08) dark++; }
    });
    if (edge && dark / edge < 0.5) add('info', 'outline', `외곽 픽셀 중 어두운 비율 ${((dark / edge) * 100).toFixed(0)}%`, '아이템은 어두운(선택적) 외곽선이 있어야 인벤토리 배경과 분리됩니다: canvas.outline("auto").');
  } else {
    const s = seamScore(c);
    const bad = [tile.includes('x') && s.x > 1.15 ? `가로 ${s.x.toFixed(2)}` : '', tile.includes('y') && s.y > 1.15 ? `세로 ${s.y.toFixed(2)}` : ''].filter(Boolean);
    if (bad.length) add('warn', 'seam', `타일 경계가 내부 최대 경계보다 튐(${bad.join(', ')}) → 이어 붙이면 격자가 보임`, 'tileNoise/MATERIALS처럼 주기적인 노이즈를 쓰고 가장자리를 맞추세요. 의도한 테두리(철판 등)면 tile:"none".');
    if (opaque < c.w * c.h && kind === 'block') add('info', 'alpha', '투명 픽셀 있음 → cutout 렌더 타입 필요(잎, 유리)', '');
  }
  const penalty = { error: 15, warn: 7, info: 2 };
  return { score: Math.max(0, 100 - issues.reduce((s, i) => s + penalty[i.severity], 0)), issues, stats: { colors: n, std, opaque } };
}

export async function spriteSheet(items) {
  // items: [{ name, canvas, kind, report }]
  const sev = { error: '#ff6b6b', warn: '#ffa94d', info: '#74c0fc' };
  const blocks = items.map(({ name, canvas: c, kind, report }) => {
    const src = c.toDataURL();
    const big = Math.max(1, Math.floor(256 / c.w));
    const tile = kind === 'block'
      ? `<figure><div style="width:${c.w * 3 * 4}px;height:${c.h * 3 * 4}px;background:url(${src}) 0 0/${c.w * 4}px ${c.h * 4}px;image-rendering:pixelated"></div><figcaption>3×3 타일링</figcaption></figure>`
      : `<figure><div class="slot"><img src="${src}" style="width:${c.w * 3}px;image-rendering:pixelated"></div><div class="hot"><img src="${src}" style="width:${c.w * 2}px;image-rendering:pixelated"></div><figcaption>인벤토리 슬롯 ×3 · 핫바 ×2</figcaption></figure>`;
    const pal = [...c.colors().entries()].sort((a, b) => hexToOklch(a[0]).L - hexToOklch(b[0]).L)
      .map(([h, n]) => `<span title="${h} ${n}px" style="background:${h}"></span>`).join('');
    const iss = report.issues.map(i => `<li><b style="color:${sev[i.severity]}">${i.severity}</b> ${i.msg}${i.fix ? `<br><i>→ ${i.fix}</i>` : ''}</li>`).join('') || '<li>규칙 위반 없음</li>';
    return `<section><h2>${name} <small>${kind} · ${c.w}×${c.h} · score ${report.score}</small></h2><div class="r">
      <figure><img class="big" src="${src}" style="width:${c.w * big}px;height:${c.h * big}px;background-size:${big}px ${big}px"><figcaption>×${big} 픽셀 격자</figcaption></figure>
      <figure><img src="${src}" style="width:${c.w}px;image-rendering:pixelated;margin:8px"><img src="${src}" style="width:${c.w * 2}px;image-rendering:pixelated;margin:8px"><figcaption>원본 크기 ×1 ×2</figcaption></figure>
      ${tile}
      <figure><img src="${src}" style="width:${c.w * 6}px;image-rendering:pixelated;filter:grayscale(1)"><figcaption>흑백(명도)</figcaption></figure>
      <div class="info"><div class="pal">${pal}</div><ul>${iss}</ul></div></div></section>`;
  });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#202024;color:#ddd;font:13px Pretendard,sans-serif}section{padding:12px 16px;border-bottom:1px solid #333}h2{font-size:16px;margin:0 0 8px}h2 small{color:#8ce99a}
    .r{display:flex;gap:14px;align-items:flex-start}figure{margin:0}figcaption{color:#999;margin-top:4px}
    img.big{image-rendering:pixelated;display:block;background-image:linear-gradient(#0004 1px,transparent 1px),linear-gradient(90deg,#0004 1px,transparent 1px),repeating-conic-gradient(#3a3a40 0 25%,#323238 0 50%)}
    .slot{width:${18 * 3}px;height:${18 * 3}px;background:#8b8b8b;border:3px solid;border-color:#373737 #fff #fff #373737;display:flex;align-items:center;justify-content:center}
    .hot{margin-top:8px;width:44px;height:44px;background:#5a5a5a99;outline:2px solid #ddd;display:flex;align-items:center;justify-content:center}
    .info{flex:1}.pal{display:flex;flex-wrap:wrap;gap:2px;margin-bottom:8px}.pal span{width:18px;height:18px;display:block}li{margin-bottom:5px}i{color:#999}
  </style></head><body>${blocks.join('')}</body></html>`;
  const b = await browser();
  const page = await b.newPage({ viewport: { width: 1200, height: 400 } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ fullPage: true });
  await page.close();
  return png;
}
