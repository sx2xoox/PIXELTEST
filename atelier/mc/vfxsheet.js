// VFX 검수 시트: 프레임 시퀀스(확대) · 원소별 틴트 · 어두운 장면 위 합성(게임 속 느낌) · 비평
import { browser } from '../render.js';
import { tint, ELEMENTS } from './vfx.js';

export async function vfxSheet(effects) {
  const sev = { error: '#ff6b6b', warn: '#ffa94d', info: '#74c0fc' };
  const secs = effects.map(e => {
    const f0 = e.frames[0], scale = Math.max(2, Math.floor(160 / f0.w));
    const frames = e.frames.map((f, i) => `<figure><img src="${f.toDataURL()}" style="width:${f.w * scale}px"><figcaption>${i}</figcaption></figure>`).join('');
    const mid = e.frames[Math.floor(e.frames.length / 2)];
    const tints = Object.entries(ELEMENTS).map(([k, hex]) => `<figure class="dark"><img src="${tint(mid, hex).toDataURL()}" style="width:${mid.w * scale * 0.75}px"><figcaption>${k}</figcaption></figure>`).join('');
    const scene = e.frames.map(f => `<div class="scene"><img src="${tint(f, e.preview ?? ELEMENTS.holy).toDataURL()}" style="width:${f.w * scale * 0.75}px"></div>`).join('');
    const iss = e.issues.map(i => `<li><b style="color:${sev[i.severity]}">${i.severity}</b> ${i.msg}${i.fix ? ` <i>→ ${i.fix}</i>` : ''}</li>`).join('') || '<li>규칙 위반 없음</li>';
    return `<section><h2>${e.name} <small>${e.use} · ${f0.w}×${f0.h} × ${e.frames.length}프레임${e.particle ? ` · 파티클 ${e.particle}` : ''}</small></h2>
      <div class="row">${frames}</div><div class="cap">흑백(틴트용) 프레임</div>
      <div class="row">${tints}</div><div class="cap">원소 틴트(곱연산 — 게임과 동일)</div>
      <div class="row">${scene}</div><div class="cap">어두운 장면 위 합성(screen) 시퀀스</div><ul>${iss}</ul></section>`;
  });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#1d1d22;color:#ddd;font:13px Pretendard,sans-serif}section{padding:12px 16px;border-bottom:1px solid #333}
    h2{font-size:16px;margin:0 0 8px}h2 small{color:#8ce99a}.row{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}
    figure{margin:0;background:repeating-conic-gradient(#3a3a40 0 25%,#2e2e34 0 50%) 0 0/12px 12px}figure.dark{background:#0d0f1a}
    img{image-rendering:pixelated;display:block}figcaption{font-size:11px;color:#999;background:#18181b;padding:1px 4px}
    .scene{background:radial-gradient(circle at 50% 70%,#2a3550,#0b0e18);padding:6px}.scene img{mix-blend-mode:screen}
    .cap{color:#888;font-size:11px;margin:3px 0 10px}li{margin-bottom:4px}i{color:#999}
  </style></head><body>${secs.join('')}</body></html>`;
  const b = await browser();
  const page = await b.newPage({ viewport: { width: 1200, height: 400 } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ fullPage: true });
  await page.close();
  return png;
}
