// 기준선 SVG를 그대로 렌더(엔진·레이아웃·비평 없이, 작성된 SVG 그대로)
import fs from 'fs';
import { browser, close } from '../atelier/render.js';
const b = await browser();
for (const [f, w, h] of [['b1_icon', 1024, 1024], ['b2_poster', 1080, 1350]]) {
  const page = await b.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<!doctype html><html><body style="margin:0">${fs.readFileSync(`bench/baseline/${f}.svg`, 'utf8')}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  fs.writeFileSync(`out/bench/baseline_${f}.png`, await page.screenshot({ clip: { x: 0, y: 0, width: w, height: h } }));
  await page.close();
}
await close();
