// 글자 잉크 상자 실측 → metrics.json (e3.mjs가 정렬에 사용)
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url + '/../../../../atelier/');
const { chromium } = require('playwright');
const specs = JSON.parse(process.argv[2]);
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent('<html><body></body></html>');
const out = await p.evaluate(async specs => {
  const c = document.createElement('canvas').getContext('2d');
  const r = {};
  for (const [key, s] of Object.entries(specs)) {
    const font = `${s.weight} ${s.size}px "${s.font}"`;
    await document.fonts.load(font, s.text);
    c.font = font; c.letterSpacing = (s.ls || 0) + 'px';
    const m = c.measureText(s.text);
    r[key] = { adv: m.width, left: -m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
  }
  return r;
}, specs);
console.log(JSON.stringify(out, null, 1));
await b.close();
