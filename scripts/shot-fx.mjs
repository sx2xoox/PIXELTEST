// 이펙트 섹션을 여러 틱에서 캡처해 콘택트 시트로(검증용)
import { browser, close } from '../atelier/render.js';
const [file, out, sec, ...ticks] = process.argv.slice(2);
const b = await browser();
const page = await b.newPage({ viewport: { width: 760, height: 900 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('file://' + (file.startsWith('/') ? file : process.cwd() + '/' + file));
await page.evaluate(id => window.__viewer.show(id), sec);
await page.waitForTimeout(800);
const shots = [];
for (const t of ticks) {
  await page.evaluate(t => window.__viewer.setTime(t / 20), +t);
  await page.waitForTimeout(120);
  const el = (await page.$$('.stage canvas'))[+(process.env.PANE || 0)];
  shots.push(await el.screenshot());
}
const html = `<body style="margin:0;background:#111;display:flex;flex-wrap:wrap;gap:4px">${shots.map((s, i) => `<figure style="margin:0;color:#ccc;font:12px sans-serif"><img src="data:image/png;base64,${s.toString('base64')}" style="width:300px"><figcaption>tick ${ticks[i]}</figcaption></figure>`).join('')}</body>`;
await page.setViewportSize({ width: 1240, height: 400 });
await page.setContent(html);
await page.screenshot({ path: out, fullPage: true });
console.log('errors', errs);
await close();
