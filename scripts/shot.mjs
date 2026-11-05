// 뷰어 로컬 HTML의 섹션별 캡처(검증용)
import { browser, close } from '../atelier/render.js';
const [file, out, ...secs] = process.argv.slice(2);
const b = await browser();
const page = await b.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 1 });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
await page.goto('file://' + (file.startsWith('/') ? file : process.cwd() + '/' + file));
for (const s of secs) {
  await page.evaluate(id => window.__viewer.show(id), s);
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__viewer.setTime(0.45));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}-${s}.png`, fullPage: true });
}
console.log('errors:', errs.slice(0, 5));
await close();
