// 렌더러 + 측정기 + 비평 시트 생성기. 로컬 Chromium만 쓴다.

import { createRequire } from 'module';
import { compile } from './scene.js';
import { critique } from './critic.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

let browserP;
export async function browser() {
  browserP ??= chromium.launch();
  return browserP;
}
export async function close() {
  if (browserP) (await browserP).close();
  browserP = undefined;
}

const html = (body, css = '') =>
  `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent}${css}</style></head><body>${body}</body></html>`;

/** 이미지 분석(페이지 안 canvas에서 실행). */
async function analyze(page, fullB64, bgB64, W, H, textMeta) {
  return page.evaluate(
    async ({ fullB64, bgB64, W, H, textMeta }) => {
      const load = src =>
        new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = 'data:image/png;base64,' + src;
        });
      const pix = async b64 => {
        const im = await load(b64);
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d');
        g.drawImage(im, 0, 0, W, H);
        return g.getImageData(0, 0, W, H).data;
      };
      const full = await pix(fullB64);
      const bg = await pix(bgB64);
      const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      const lum = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
      const hexLum = h => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
      const oklab = (d, i) => {
        const r = lin(d[i]), g = lin(d[i + 1]), b = lin(d[i + 2]);
        const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
        const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
        const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
        return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
      };

      // 텍스트 대비: 글자를 지운 배경에서 글자 영역 픽셀을 샘플링
      const texts = textMeta.map(t => {
        const b = t.box;
        const x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y));
        const x1 = Math.min(W, Math.ceil(b.x + b.w)), y1 = Math.min(H, Math.ceil(b.y + b.h));
        const bgL = [], fgL = [];
        const step = Math.max(1, Math.floor(Math.sqrt(((x1 - x0) * (y1 - y0)) / 4000)));
        for (let y = y0; y < y1; y += step)
          for (let x = x0; x < x1; x += step) {
            const i = (y * W + x) * 4;
            const lb = lum(bg, i), lf = lum(full, i);
            bgL.push(lb);
            if (Math.abs(lf - lb) > 0.02) fgL.push(lf);
          }
        let textL = t.fill ? hexLum(t.fill) : null;
        if (textL == null && fgL.length) { fgL.sort((a, b) => a - b); textL = fgL[Math.floor(fgL.length / 2)]; }
        let p10 = null, med = null;
        if (bgL.length && textL != null) {
          const cr = bgL.map(l => (Math.max(l, textL) + 0.05) / (Math.min(l, textL) + 0.05)).sort((a, b) => a - b);
          p10 = cr[Math.floor(cr.length * 0.1)];
          med = cr[Math.floor(cr.length / 2)];
        }
        return { ...t, contrastP10: p10, contrastMedian: med };
      });

      // 배경색 추정: 테두리 픽셀의 최빈값
      const key = (d, i) => ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
      const border = new Map();
      for (let x = 0; x < W; x += 4) for (const y of [0, H - 1]) { const i = (y * W + x) * 4; const k = key(full, i); border.set(k, (border.get(k) || 0) + 1); }
      for (let y = 0; y < H; y += 4) for (const x of [0, W - 1]) { const i = (y * W + x) * 4; const k = key(full, i); border.set(k, (border.get(k) || 0) + 1); }
      let bk = 0, bc = -1;
      for (const [k, c] of border) if (c > bc) { bc = c; bk = k; }
      let bgLab = [0, 0, 0], nb = 0;
      for (let x = 0; x < W; x += 4) for (const y of [0, H - 1]) { const i = (y * W + x) * 4; if (key(full, i) === bk) { const o = oklab(full, i); bgLab = bgLab.map((v, j) => v + o[j]); nb++; } }
      bgLab = bgLab.map(v => v / Math.max(1, nb));

      // 무게중심, 채움 비율, 색 덩어리, 명도 분포
      const S = Math.max(1, Math.floor(Math.max(W, H) / 200));
      let sw = 0, sx = 0, sy = 0, filled = 0, total = 0;
      const bins = new Map();
      const Ls = [];
      for (let y = 0; y < H; y += S)
        for (let x = 0; x < W; x += S) {
          const i = (y * W + x) * 4;
          const o = oklab(full, i);
          const dist = Math.hypot(o[0] - bgLab[0], o[1] - bgLab[1], o[2] - bgLab[2]);
          const w = Math.min(1, dist / 0.25);
          sw += w; sx += w * (x / W); sy += w * (y / H);
          if (dist > 0.06) filled++;
          total++;
          Ls.push(o[0]);
          const bkey = `${Math.round(o[0] * 10)}|${Math.round(o[1] * 20)}|${Math.round(o[2] * 20)}`;
          const e = bins.get(bkey) || { n: 0, r: 0, g: 0, b: 0 };
          e.n++; e.r += full[i]; e.g += full[i + 1]; e.b += full[i + 2];
          bins.set(bkey, e);
        }
      // 디테일이 많은 칸(4x4) 찾기: 확대 검사 대상
      const cells = [];
      for (let gy = 0; gy < 4; gy++)
        for (let gx = 0; gx < 4; gx++) {
          let e = 0;
          const x0 = Math.floor((gx * W) / 4), y0 = Math.floor((gy * H) / 4), x1 = Math.floor(((gx + 1) * W) / 4) - 1, y1 = Math.floor(((gy + 1) * H) / 4) - 1;
          const st = Math.max(1, Math.floor(W / 256));
          for (let y = y0; y < y1; y += st)
            for (let x = x0; x < x1; x += st) {
              const i = (y * W + x) * 4, j = i + 4 * st, k2 = i + 4 * W * st;
              e += Math.abs(lum(full, i) - lum(full, j)) + Math.abs(lum(full, i) - lum(full, k2));
            }
          cells.push({ gx, gy, e });
        }
      const detail = cells.sort((a, b) => b.e - a.e).slice(0, 4).map(({ gx, gy }) => [gx, gy]);
      const colors = [...bins.values()].filter(e => e.n / total > 0.015).sort((a, b) => b.n - a.n)
        .map(e => ({ hex: '#' + [e.r, e.g, e.b].map(v => Math.round(v / e.n).toString(16).padStart(2, '0')).join(''), share: +(e.n / total).toFixed(3) }));
      const mean = Ls.reduce((a, b) => a + b, 0) / Ls.length;
      const std = Math.sqrt(Ls.reduce((a, b) => a + (b - mean) ** 2, 0) / Ls.length);
      const dark = Ls.filter(l => l < 0.4).length / Ls.length;
      const light = Ls.filter(l => l > 0.8).length / Ls.length;
      return {
        width: W, height: H, texts, detail,
        balance: { dx: sw ? sx / sw - 0.5 : 0, dy: sw ? sy / sw - 0.5 : 0 },
        coverage: filled / total,
        colors,
        value: { mean, std, dark, light, mid: 1 - dark - light },
      };
    },
    { fullB64, bgB64, W, H, textMeta }
  );
}

/** 장면 → { svg, png(Buffer), metrics, report } */
export async function render(scene, { scale = 1 } = {}) {
  const { svg, width: W, height: H, texts } = compile(scene);
  const b = await browser();
  const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  await page.setContent(html(svg));
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } });
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll('[data-atelier=text]')].map(el => {
      const r = el.getBoundingClientRect();
      return { id: el.id, box: { x: r.x, y: r.y, w: r.width, h: r.height }, sample: el.textContent.slice(0, 24) };
    })
  );
  await page.addStyleTag({ content: '[data-atelier=text]{visibility:hidden}' });
  const bgPng = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } });
  const meta = boxes.map(bx => ({ ...texts.find(t => t.id === bx.id), ...bx }));
  const metrics = await analyze(page, png.toString('base64'), bgPng.toString('base64'), W, H, meta);
  await page.close();
  const report = critique(metrics, scene);
  return { svg, png, metrics, report, width: W, height: H };
}

/**
 * 비평 시트: Claude가 "디자이너의 눈"으로 검수할 수 있게 한 장에 모은다.
 * 원본 · 구도 오버레이 · 흑백(명도) · 블러(스퀸트 테스트) · 작은 크기 · 확대 크롭 · 점수.
 */
export async function sheet(result, { title = 'design' } = {}) {
  const { png, width: W, height: H, metrics, report } = result;
  const src = 'data:image/png;base64,' + png.toString('base64');
  const maxW = 560;
  const k = Math.min(1, maxW / W, maxW / H);
  const dw = Math.round(W * k), dh = Math.round(H * k);
  const boxes = metrics.texts
    .map(t => {
      const c = t.contrastP10;
      const bad = c != null && c < (t.size >= 24 ? 3 : 4.5);
      return `<div class="box ${bad ? 'bad' : ''}" style="left:${t.box.x * k}px;top:${t.box.y * k}px;width:${t.box.w * k}px;height:${t.box.h * k}px"><span>${c ? c.toFixed(1) : '?'}:1</span></div>`;
    })
    .join('');
  const cx = (0.5 + metrics.balance.dx) * dw, cy = (0.5 + metrics.balance.dy) * dh;
  const zoom = metrics.detail
    .map(([gx, gy]) => `<div class="crop" style="width:${dw / 2}px;height:${dh / 2}px;background-image:url(${src});background-size:${dw * 2}px ${dh * 2}px;background-position:-${(gx * dw) / 2}px -${(gy * dh) / 2}px"></div>`)
    .join('');
  const sev = { error: '#e03131', warn: '#f08c00', info: '#1c7ed6' };
  const issues = report.issues.map(i => `<li><b style="color:${sev[i.severity]}">${i.severity}</b> ${i.msg}<br><i>→ ${i.fix}</i></li>`).join('') || '<li>규칙 위반 없음. 이제 감각적 판단(콘셉트, 감정, 독창성)에 집중하세요.</li>';
  const sw = metrics.colors.map(c => `<div class="sw" style="background:${c.hex}"><span>${c.hex}<br>${(c.share * 100).toFixed(0)}%</span></div>`).join('');
  const body = `
  <div class="wrap">
    <h1>${title} <small>score ${report.score}/100</small></h1>
    <div class="row">
      <figure><img src="${src}" width="${dw}" height="${dh}"><figcaption>원본</figcaption></figure>
      <figure><div class="ov" style="width:${dw}px;height:${dh}px"><img src="${src}" width="${dw}" height="${dh}" style="opacity:.55">
        <div class="g v" style="left:33.33%"></div><div class="g v" style="left:66.66%"></div><div class="g h" style="top:33.33%"></div><div class="g h" style="top:66.66%"></div>
        <div class="g v c" style="left:50%"></div><div class="g h c" style="top:50%"></div>
        ${boxes}<div class="com" style="left:${cx}px;top:${cy}px"></div></div><figcaption>구도: 3분할 · 중심 · 무게중심(●) · 텍스트 대비</figcaption></figure>
    </div>
    <div class="row">
      <figure><img src="${src}" width="${dw / 2}" style="filter:grayscale(1)"><figcaption>흑백(명도 구조)</figcaption></figure>
      <figure><img src="${src}" width="${dw / 2}" style="filter:blur(${Math.max(3, dw / 60)}px)"><figcaption>스퀸트(덩어리 구도)</figcaption></figure>
      <figure class="small"><div class="smalls"><img src="${src}" width="96"><img src="${src}" width="48"><img src="${src}" width="24"></div><figcaption>작은 크기 식별성</figcaption>
        <div class="sws">${sw}</div><figcaption>실제 사용된 색 덩어리</figcaption></figure>
    </div>
    <div class="row"><figure><div class="grid2">${zoom}</div><figcaption>디테일 많은 4칸 200% 확대(가장자리·글자·질감 검사)</figcaption></figure>
      <div class="issues"><h2>규칙 비평</h2><ul>${issues}</ul>
      <p class="m">명도 std ${metrics.value.std.toFixed(3)} · 어두움 ${(metrics.value.dark * 100).toFixed(0)}% · 밝음 ${(metrics.value.light * 100).toFixed(0)}% · 채움 ${(metrics.coverage * 100).toFixed(0)}%</p></div></div>
  </div>`;
  const css = `body{background:#1e1e22;color:#ddd;font:13px Pretendard,sans-serif}.wrap{padding:18px;width:${dw * 2 + 60}px}h1{font-size:20px;margin:0 0 10px}h1 small{color:#8ce99a;margin-left:8px}
  .row{display:flex;gap:16px;margin-bottom:14px;align-items:flex-start}figure{margin:0}figcaption{color:#999;margin-top:4px}
  .ov{position:relative;background:#fff;overflow:hidden}.ov img{position:absolute;left:0;top:0}.g{position:absolute;background:rgba(255,0,140,.7)}.g.v{width:1px;top:0;bottom:0}.g.h{height:1px;left:0;right:0}.g.c{background:rgba(0,200,255,.7)}
  .box{position:absolute;outline:1.5px solid #37b24d}.box.bad{outline-color:#e03131}.box span{position:absolute;top:-15px;left:0;font-size:10px;background:#000;color:#fff;padding:0 3px}
  .com{position:absolute;width:12px;height:12px;margin:-6px;border-radius:50%;background:#ffd43b;border:2px solid #000}
  .smalls{display:flex;gap:10px;align-items:flex-end;background:#fff;padding:8px}.sws{display:flex;flex-wrap:wrap;gap:4px;width:${dw / 2}px;margin-top:8px}.sw{width:52px;height:40px;position:relative}.sw span{position:absolute;bottom:-1px;left:0;font-size:9px;background:rgba(0,0,0,.6);color:#fff;padding:0 2px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:4px}.crop{background-repeat:no-repeat;image-rendering:auto}
  .issues{flex:1;background:#2a2a30;padding:10px 14px;border-radius:6px}.issues h2{font-size:15px;margin:0 0 6px}.issues li{margin-bottom:6px}.issues i{color:#aaa}.m{color:#888}`;
  const b = await browser();
  const page = await b.newPage({ viewport: { width: dw * 2 + 60, height: 400 }, deviceScaleFactor: 1 });
  await page.setContent(html(body, css));
  await page.evaluate(() => document.fonts.ready);
  const out = await page.screenshot({ fullPage: true });
  await page.close();
  return out;
}

/** 여러 시안을 나란히 놓고 비교(best-of-K 선택용) */
export async function compareSheet(items) {
  const cells = items
    .map(({ name, result }) => {
      const src = 'data:image/png;base64,' + result.png.toString('base64');
      const errs = result.report.issues.filter(i => i.severity !== 'info').length;
      return `<figure><img src="${src}"><figcaption><b>${name}</b> · score ${result.report.score} · 문제 ${errs}개</figcaption><img class="g" src="${src}"></figure>`;
    })
    .join('');
  const css = `body{background:#1e1e22;color:#ddd;font:14px Pretendard,sans-serif}.r{display:flex;gap:16px;padding:16px}figure{margin:0;width:360px}figure img{width:360px;display:block}img.g{filter:grayscale(1) blur(2px);width:120px;margin-top:6px}figcaption{margin-top:6px}`;
  const b = await browser();
  const page = await b.newPage({ viewport: { width: items.length * 376 + 16, height: 300 } });
  await page.setContent(html(`<div class="r">${cells}</div>`, css));
  const out = await page.screenshot({ fullPage: true });
  await page.close();
  return out;
}
