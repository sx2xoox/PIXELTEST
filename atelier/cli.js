#!/usr/bin/env node
// atelier CLI
//   render  <scene.json|scene.mjs> [--out dir] [--scale 2]   → svg, png, 비평 시트, 리포트
//   compare <a> <b> ...           [--out dir]                → 시안 비교 시트
//   palette <#hex> [harmony]      [--out dir]                → 토큰 + 스와치
//   mc      <model.mjs|json> ...  [--out dir]                → .bbmodel, Java JSON, 텍스처, 3D 미리보기 시트
//   sprite  <sprites.mjs> ...     [--out dir]                → 16×16 픽셀 텍스처/아이템 png, 아이템 JSON, 검수 시트

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { render, sheet, compareSheet, close } from './render.js';
import { palette, contrast } from './color.js';
import { compileModel } from './mc/model.js';
import { toBBModel, toJavaBlockModel, itemModel } from './mc/export.js';
import { modelSheet } from './mc/render3d.js';
import { critiqueSprite, spriteSheet } from './mc/sprite.js';

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
  } else if (cmd === 'mc') {
    for (const file of args) {
      const spec = await loadScene(file);
      const m = compileModel(spec);
      const name = spec.name ?? base(file);
      fs.writeFileSync(path.join(outDir, name + '.bbmodel'), JSON.stringify(toBBModel(m)));
      fs.writeFileSync(path.join(outDir, name + '.texture.png'), m.atlas.toPNG());
      if (m.type === 'block') fs.writeFileSync(path.join(outDir, name + '.java.json'), JSON.stringify(toJavaBlockModel(m), null, 2));
      fs.writeFileSync(path.join(outDir, name + '.sheet.png'), await modelSheet(m, m.issues, { title: name }));
      const score = Math.max(0, 100 - m.issues.reduce((s, i) => s + { error: 15, warn: 7, info: 2 }[i.severity], 0));
      console.log(`\n■ ${name}  [${m.type}] cubes ${m.cubes.length} · atlas ${m.atlasW}×${m.atlasH} · score ${score}`);
      for (const i of m.issues) console.log(`  [${i.severity}] ${i.msg}${i.fix ? `\n          → ${i.fix}` : ''}`);
      console.log(`  files: ${outDir}/${name}.{bbmodel,texture.png,sheet.png${m.type === 'block' ? ',java.json' : ''}}`);
    }
  } else if (cmd === 'sprite') {
    const items = [];
    for (const file of args) {
      let list = await loadScene(file);
      if (!Array.isArray(list)) list = [list];
      for (const it of list) {
        const report = critiqueSprite(it.canvas, { kind: it.kind ?? 'item', tile: it.tile ?? 'xy' });
        items.push({ ...it, kind: it.kind ?? 'item', report });
        fs.writeFileSync(path.join(outDir, it.name + '.png'), it.canvas.toPNG());
        fs.writeFileSync(path.join(outDir, it.name + '@8x.png'), it.canvas.scale(8).toPNG());
        if ((it.kind ?? 'item') === 'item') fs.writeFileSync(path.join(outDir, it.name + '.item.json'), JSON.stringify(itemModel(it.name), null, 2));
        console.log(`■ ${it.name} [${it.kind ?? 'item'}] score ${report.score} · colors ${report.stats.colors}`);
        for (const i of report.issues) console.log(`  [${i.severity}] ${i.msg}${i.fix ? `\n          → ${i.fix}` : ''}`);
      }
      const sheetName = base(file) + '.sheet.png';
      fs.writeFileSync(path.join(outDir, sheetName), await spriteSheet(items.slice(-list.length)));
      console.log(`  sheet: ${outDir}/${sheetName}`);
    }
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
