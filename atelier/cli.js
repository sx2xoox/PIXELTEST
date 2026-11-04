#!/usr/bin/env node
// atelier CLI
//   render  <scene.json|scene.mjs> [--out dir] [--scale 2]   → svg, png, 비평 시트, 리포트
//   compare <a> <b> ...           [--out dir]                → 시안 비교 시트
//   palette <#hex> [harmony]      [--out dir]                → 토큰 + 스와치

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { render, sheet, compareSheet, close } from './render.js';
import { palette, contrast } from './color.js';

const args = process.argv.slice(2);
const cmd = args.shift();
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const outDir = opt('out', 'out');
const scale = +opt('scale', 1);
fs.mkdirSync(outDir, { recursive: true });

async function loadScene(file) {
  if (/\.(mjs|js)$/.test(file)) {
    const mod = await import(pathToFileURL(path.resolve(file)).href);
    const s = mod.default;
    return typeof s === 'function' ? await s() : s;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const base = f => path.basename(f).replace(/\.(json|mjs|js)$/, '');

async function main() {
  if (cmd === 'render') {
    for (const file of args) {
      const scene = await loadScene(file);
      const name = base(file);
      const result = await render(scene, { scale });
      fs.writeFileSync(path.join(outDir, name + '.svg'), result.svg);
      fs.writeFileSync(path.join(outDir, name + '.png'), result.png);
      const sh = await sheet(await render(scene, { scale: 1 }), { title: name });
      fs.writeFileSync(path.join(outDir, name + '.sheet.png'), sh);
      fs.writeFileSync(path.join(outDir, name + '.report.json'), JSON.stringify({ ...result.report, metrics: result.metrics }, null, 2));
      console.log(`\n■ ${name}  score ${result.report.score}/100`);
      for (const i of result.report.issues) console.log(`  [${i.severity}] ${i.msg}\n          → ${i.fix}`);
      console.log(`  files: ${outDir}/${name}.{png,svg,sheet.png,report.json}`);
    }
  } else if (cmd === 'compare') {
    const items = [];
    for (const file of args) items.push({ name: base(file), result: await render(await loadScene(file)) });
    items.sort((a, b) => b.result.report.score - a.result.report.score);
    fs.writeFileSync(path.join(outDir, 'compare.png'), await compareSheet(items));
    items.forEach(i => console.log(`${i.name}\t${i.result.report.score}`));
    console.log(`→ ${outDir}/compare.png`);
  } else if (cmd === 'palette') {
    const [seed, harmony = 'complementary'] = args;
    const t = palette(seed, harmony);
    console.log(JSON.stringify(t, null, 2));
    const rows = Object.entries(t).map(([k, r]) => ({ type: 'group', children: Object.entries(r).map(([s, hex], i) => ({ type: 'group', children: [
      { type: 'rect', x: 20 + i * 90, y: 0, w: 84, h: 70, r: 6, fill: hex },
      { type: 'text', x: 26 + i * 90, y: 60, size: 12, text: `${s}`, fill: contrast(hex, '#fff') > 3 ? '#fff' : '#111' },
    ] })) }));
    rows.forEach((r, i) => (r.transform = `translate(0,${20 + i * 84})`));
    const res = await render({ width: 1020, height: rows.length * 84 + 30, background: '#ffffff', children: rows });
    fs.writeFileSync(path.join(outDir, 'palette.png'), res.png);
    console.log(`→ ${outDir}/palette.png`);
  } else {
    console.log(fs.readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 6).join('\n'));
  }
}

main().then(close, e => { console.error(e); close(); process.exit(1); });
