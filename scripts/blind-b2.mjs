// 비교 과제 2 블라인드 캡처: 항목마다 A/B를 무작위로 배정하고, 같은 뷰어로 여러 각도·시점을 캡처해 비교 이미지를 만든다
//   node scripts/blind-b2.mjs <outDir> <keyFile>
import fs from 'fs';
import crypto from 'crypto';
import { loadSide, sectionsFor } from './b2data.mjs';
import { buildViewer } from '../atelier/viewer/build.mjs';
import { browser, close } from '../atelier/render.js';

const [outDir = 'out/blind-b2', keyFile] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const sides = { baseline: loadSide('bench2/baseline'), atelier: loadSide('bench2/atelier') };
for (const [k, s] of Object.entries(sides)) if (s.missing.length) console.log(`${k} 누락:`, s.missing);
const skin = `data:image/png;base64,${fs.readFileSync('bench2/default_skin.png').toString('base64')}`;
const cats = ['weapon', 'armor', 'basic_attack', 'skill', 'pet', 'boss'];
const key = {};
const b = await browser();
const page = await b.newPage({ viewport: { width: 1000, height: 900 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));

const VIEWS = {
  weapon: [{ pane: 0, yaw: -70, pitch: 10 }, { pane: 0, yaw: 20, pitch: 25 }, { pane: 1, yaw: -40, pitch: 15 }],
  armor: [{ pane: 0, yaw: -30, pitch: 12 }, { pane: 0, yaw: 150, pitch: 12 }, { pane: 'tex' }],
  pet: [{ pane: 0, yaw: -35, pitch: 18, t: 0 }, { pane: 0, yaw: -35, pitch: 18, t: 0.25 }, { pane: 0, yaw: 60, pitch: 30, t: 0.1 }],
  boss: [{ pane: 0, yaw: -35, pitch: 12, t: 0 }, { pane: 0, yaw: -35, pitch: 12, t: 0.3 }, { pane: 0, yaw: -35, pitch: 12, t: 0.45 }, { pane: 0, yaw: 150, pitch: 15, t: 0 }],
};
for (const cat of cats) {
  const flip = crypto.randomInt(2) === 1;
  const order = flip ? ['atelier', 'baseline'] : ['baseline', 'atelier'];
  key[cat] = { A: order[0], B: order[1] };
  const shots = {};
  for (const [label, side] of [['A', order[0]], ['B', order[1]]]) {
    const sec = sectionsFor({ [label]: sides[side] }).find(s => s.id === cat);
    const file = `${outDir}/_${cat}_${label}.html`;
    buildViewer({ skin, sections: [sec] }, file, { inlineThree: true, title: label });
    await page.goto('file://' + process.cwd() + '/' + file);
    await page.waitForTimeout(700);
    const imgs = [];
    if (cat === 'basic_attack' || cat === 'skill') {
      const dur = await page.evaluate(() => window.__viewer.stages()[0].duration());
      for (let i = 0; i < 8; i++) {
        const t = (dur * (i + 0.5)) / 8;
        await page.evaluate(t => window.__viewer.stages().forEach(s => { s.playing = false; s.t = t; }), t);
        await page.waitForTimeout(90);
        imgs.push({ cap: `${Math.round(t * 20)} tick`, png: await (await page.$$('.stage canvas'))[0].screenshot() });
      }
    } else for (const v of VIEWS[cat]) {
      if (v.pane === 'tex') { const el = (await page.$$('.tex'))[0]; if (el) imgs.push({ cap: '텍스처·아이콘', png: await el.screenshot() }); continue; }
      await page.evaluate(v => { const s = window.__viewer.stages()[v.pane]; if (!s) return; s.playing = false; s.yaw = v.yaw; s.pitch = v.pitch; if (v.t !== undefined) s.t = v.t * s.duration(); }, v);
      await page.waitForTimeout(110);
      const el = (await page.$$('.stage canvas'))[v.pane];
      if (el) imgs.push({ cap: v.t !== undefined ? `t=${v.t}` : `${v.yaw}°`, png: await el.screenshot() });
    }
    shots[label] = imgs;
  }
  const row = (label, imgs) => `<div class="row"><div class="lab">${label}</div>${imgs.map(i => `<figure><img src="data:image/png;base64,${i.png.toString('base64')}"><figcaption>${i.cap}</figcaption></figure>`).join('')}</div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#111;color:#ddd;font:14px sans-serif;padding:10px}.row{display:flex;gap:6px;align-items:flex-start;margin-bottom:14px;flex-wrap:wrap}.lab{font:bold 40px sans-serif;width:50px}figure{margin:0}img{height:240px;display:block;image-rendering:pixelated}figcaption{font-size:12px;color:#999}</style></head><body>${row('A', shots.A)}${row('B', shots.B)}</body></html>`;
  await page.setViewportSize({ width: cat.includes('attack') || cat === 'skill' ? 1400 : 1300, height: 400 });
  await page.setContent(html);
  await page.screenshot({ path: `${outDir}/${cat}.png`, fullPage: true });
  await page.setViewportSize({ width: 1000, height: 900 });
}
fs.writeFileSync(keyFile, JSON.stringify(key));
console.log('ok', errs.slice(0, 5));
await close();
