#!/usr/bin/env node
// atelier CLI
//   render  <scene.json|scene.mjs> [--out dir] [--scale 2]   → svg, png, 비평 시트, 리포트
//   compare <a> <b> ...           [--out dir]                → 시안 비교 시트
//   palette <#hex> [harmony]      [--out dir]                → 토큰 + 스와치
//   mc      <model.mjs|json> ...  [--out dir]                → .bbmodel, Java JSON, 텍스처, 3D 미리보기 시트
//   sprite  <sprites.mjs> ...     [--out dir]                → 16×16 픽셀 텍스처/아이템 png, 아이템 JSON, 검수 시트
//   addon   <entity 모델...>      [--out dir] [--ns atelier]  → Bedrock .mcaddon(RP+BP, 소환 가능한 몹)
//   pack    <model/sprite 파일...> [--out dir] [--ns atelier] [--pack-format 46] → Java 리소스팩 폴더 + zip

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { render, sheet, compareSheet, close } from './render.js';
import { FORMATS } from './layout.js';
import { palette, contrast } from './color.js';
import { compileModel } from './mc/model.js';
import { toBBModel, toJavaBlockModel, itemModel, toBedrockGeometry, toBedrockAnimation, toJavaPartModels, toBlockstate } from './mc/export.js';
import { modelSheet } from './mc/render3d.js';
import { critiqueSprite, spriteSheet } from './mc/sprite.js';
import { buildPack, buildBedrockAddon } from './mc/pack.js';

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
const formats = opt('formats', null); // 예: square,portrait,story,landscape
const ns = opt('ns', 'atelier');
const packFormat = +opt('pack-format', 46);
const packName = opt('name', 'atelier_pack');
fs.mkdirSync(outDir, { recursive: true });

async function loadScene(file, ctx = {}) {
  if (/\.(mjs|js)$/.test(file)) {
    const mod = await import(pathToFileURL(path.resolve(file)).href);
    const s = mod.default;
    return typeof s === 'function' ? await s(ctx) : s;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const base = f => path.basename(f).replace(/\.(json|mjs|js)$/, '');

async function main() {
  if (cmd === 'render' && formats) {
    // 반응형: 장면 함수가 ({ width, height, format })를 받아 규격별 레이아웃을 만든다
    for (const file of args) {
      const items = [];
      for (const f of formats.split(',')) {
        const [width, height] = FORMATS[f] ?? f.split('x').map(Number);
        const scene = await loadScene(file, { width, height, format: f });
        const result = await render(scene, { scale });
        const name = `${base(file)}.${f}`;
        fs.writeFileSync(path.join(outDir, name + '.png'), result.png);
        fs.writeFileSync(path.join(outDir, name + '.sheet.png'), await sheet(result, { title: name }));
        items.push({ name: f, result });
        console.log(`■ ${name} ${width}×${height} score ${result.report.score}`);
        for (const i of result.report.issues) console.log(`  [${i.severity}] ${i.msg}`);
      }
      fs.writeFileSync(path.join(outDir, base(file) + '.formats.png'), await compareSheet(items));
      console.log(`→ ${outDir}/${base(file)}.formats.png`);
    }
  } else if (cmd === 'render') {
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
      if (!spec || !(spec.cubes || spec.parts)) { console.log(`  건너뜀: ${file}은 큐브 모델이 아님(스프라이트면 sprite 명령)`); continue; }
      const m = compileModel(spec);
      const name = spec.name ?? base(file);
      fs.writeFileSync(path.join(outDir, name + '.bbmodel'), JSON.stringify(toBBModel(m)));
      fs.writeFileSync(path.join(outDir, name + '.texture.png'), m.atlas.toPNG());
      const written = ['bbmodel', 'texture.png', 'sheet.png'];
      for (const [fn, cv] of Object.entries(spec.extraFiles ?? {})) { fs.writeFileSync(path.join(outDir, fn), cv.toPNG()); console.log(`  + ${outDir}/${fn}`); }
      if (m.type === 'block') {
        if (spec.parts) {
          for (const [mn, json] of Object.entries(toJavaPartModels(m))) { fs.writeFileSync(path.join(outDir, mn + '.java.json'), JSON.stringify(json, null, 2)); written.push(`${mn}.java.json`); }
          fs.writeFileSync(path.join(outDir, name + '.blockstate.json'), JSON.stringify(toBlockstate(m), null, 2)); written.push('blockstate.json');
        } else { fs.writeFileSync(path.join(outDir, name + '.java.json'), JSON.stringify(toJavaBlockModel(m), null, 2)); written.push('java.json'); }
      } else {
        fs.writeFileSync(path.join(outDir, name + '.geo.json'), JSON.stringify(toBedrockGeometry(m), null, 2)); written.push('geo.json');
        if (Object.keys(m.animations).length) { fs.writeFileSync(path.join(outDir, name + '.animation.json'), JSON.stringify(toBedrockAnimation(m), null, 2)); written.push('animation.json'); }
      }
      fs.writeFileSync(path.join(outDir, name + '.sheet.png'), await modelSheet(m, m.issues, { title: name }));
      const score = Math.max(0, 100 - m.issues.reduce((s, i) => s + { error: 15, warn: 7, info: 2 }[i.severity], 0));
      console.log(`\n■ ${name}  [${m.type}] cubes ${m.cubes.length} · atlas ${m.atlasW}×${m.atlasH} · score ${score}`);
      for (const i of m.issues) console.log(`  [${i.severity}] ${i.msg}${i.fix ? `\n          → ${i.fix}` : ''}`);
      console.log(`  files: ${outDir}/${name}.{${written.join(',')}}`);
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
  } else if (cmd === 'pack') {
    const blocks = [], items = [];
    for (const file of args) {
      const loaded = await loadScene(file);
      if (loaded && (loaded.cubes || loaded.parts)) {
        const m = compileModel(loaded);
        if (m.type !== 'block') { console.log(`  건너뜀: ${loaded.name}은 entity(리소스팩 블록 모델이 아님 — .bbmodel을 쓰세요)`); continue; }
        blocks.push({ name: loaded.name, models: toJavaPartModels(m), blockstate: toBlockstate(m), texture: m.atlas });
      } else for (const it of [].concat(loaded)) {
        if ((it.kind ?? 'item') === 'item') items.push({ name: it.name, texture: it.canvas });
        else blocks.push({ name: it.name, model: { parent: 'minecraft:block/cube_all' }, texture: it.canvas });
      }
    }
    const r = buildPack(outDir, { name: packName, ns, packFormat, blocks, items });
    console.log(`리소스팩: 블록 ${blocks.length} · 아이템 ${items.length} · 파일 ${r.count}개\n  ${r.root}/\n  ${r.zipPath}`);
  } else if (cmd === 'addon') {
    const entities = [];
    for (const file of args) {
      const spec = await loadScene(file);
      if (!spec?.cubes && !spec?.texture) continue;
      const m = compileModel(spec);
      if (m.type !== 'entity') { console.log(`  건너뜀: ${spec.name}은 entity가 아님`); continue; }
      entities.push({ name: spec.name, displayName: spec.displayName, geometry: toBedrockGeometry(m), animation: Object.keys(m.animations).length ? toBedrockAnimation(m) : null, texture: m.atlas, hitbox: spec.hitbox, health: spec.health, eggColors: spec.eggColors });
    }
    const r = buildBedrockAddon(outDir, { name: packName === 'atelier_pack' ? 'atelier_addon' : packName, ns, entities });
    console.log(`Bedrock 애드온: 엔티티 ${entities.length} · 파일 ${r.count}개\n  ${r.root}/\n  ${r.addonPath}\n  게임에서: /summon ${ns}:${entities[0]?.name}`);
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
