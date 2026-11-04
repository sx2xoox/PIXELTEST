// 폴터가이스트 빌드: classes/poltergeist/{weapon,armor,fx,pet,boss}에 산출물 + out/pg/poltergeist.html 뷰어
//   node classes/poltergeist/src/build.mjs [weapon armor fx pet boss ...]
import fs from 'fs';
import path from 'path';
import { compileModel } from '../../../atelier/mc/model.js';
import { toModelEngine, lintModelEngine } from '../../../atelier/mc/export.js';
import { buildViewer } from '../../../atelier/viewer/build.mjs';

const OUT = 'classes/poltergeist';
const only = process.argv.slice(2);
const want = k => !only.length || only.includes(k);
const write = (p, d) => { fs.mkdirSync(path.dirname(path.join(OUT, p)), { recursive: true }); fs.writeFileSync(path.join(OUT, p), d); };
const report = [];
function model(spec, file) {
  const m = compileModel(spec);
  const bb = toModelEngine(m);
  write(file, JSON.stringify(bb));
  const iss = [...m.issues, ...lintModelEngine(m)].filter(i => !(spec.role === 'item' && i.msg.includes('hitbox')));
  report.push(`■ ${file} cubes ${m.cubes.length} · atlas ${m.atlasW}×${m.atlasH} · colors ${m.atlas.colors().size}`, ...iss.map(i => `  [${i.severity}] ${i.msg}`));
  write(file.replace('.bbmodel', '.png'), m.atlas.toPNG());
  return bb;
}
const sections = [];
const skin = 'data:image/png;base64,' + fs.readFileSync('bench2/default_skin.png').toString('base64');
const S = (c, k) => c.scale(k).toDataURL();

const w = await import('./weapon.mjs');
const weaponBB = model({ ...w.default(), role: 'item' }, 'weapon/uproar_candelabra.bbmodel');
write('weapon/icon.png', w.icon().toPNG());
if (want('weapon')) sections.push({ id: 'weapon', title: '무기 · 소란의 촛대', panes: [
  { label: '소란의 촛대', kind: 'model', model: weaponBB, yaw: -55, pitch: 12 },
  { label: '손에 든 모습', kind: 'player', weapon: weaponBB, yaw: -40 },
  { label: '아이콘', kind: 'textures', textures: [{ name: '16×16', src: S(w.icon(), 12), w: 192 }] },
] });

const a = await import('./armor.mjs');
const ar = a.default();
write('armor/humanoid.png', ar.humanoid.toPNG()); write('armor/humanoid_leggings.png', ar.leggings.toPNG());
for (const [k, c] of Object.entries(ar.icons)) write(`armor/icons/${k}.png`, c.toPNG());
const armor = { humanoid: ar.humanoid.toDataURL(), leggings: ar.leggings.toDataURL() };
if (want('armor')) sections.push({ id: 'armor', title: '갑옷 · 망령 집사복', panes: [
  { label: '착용(앞)', kind: 'player', armor, weapon: weaponBB, yaw: -30 },
  { label: '착용(뒤)', kind: 'player', armor, weapon: weaponBB, yaw: 150 },
  { label: '텍스처·아이콘', kind: 'textures', textures: [{ name: 'humanoid', src: S(ar.humanoid, 5), w: 320 }, { name: 'leggings', src: S(ar.leggings, 5), w: 320 }, ...Object.entries(ar.icons).map(([k, c]) => ({ name: k, src: S(c, 8), w: 96 }))] },
] });

if (want('fx') && fs.existsSync(new URL('./fx.mjs', import.meta.url))) {
  const f = await import('./fx.mjs');
  fs.rmSync(path.join(OUT, 'fx'), { recursive: true, force: true });
  for (const kind of ['basic_attack', 'skill']) {
    const { timeline, frames } = f[kind]();
    write(`fx/${kind}/timeline.json`, JSON.stringify(timeline, null, 2));
    const urls = {};
    for (const [n, c] of Object.entries(frames)) { write(`fx/${kind}/${n}`, c.toPNG()); urls[n] = c.toDataURL(); }
    sections.push({ id: kind, title: kind === 'skill' ? '스킬' : '기본 공격 3연타', panes: [{ label: timeline.name, kind: 'fx', timeline, frames: urls, weapon: weaponBB, armor, yaw: -40, pitch: 20 }] });
  }
}
for (const [k, file] of [['pet', 'pet/teapot_ghost.bbmodel'], ['boss', 'boss/manor_clock.bbmodel']]) {
  if (!want(k) || !fs.existsSync(new URL(`./${k}.mjs`, import.meta.url))) continue;
  const mod = await import(`./${k}.mjs`);
  const bb = model(mod.default(), file);
  sections.push({ id: k, title: k === 'pet' ? '펫 · 찻주전자 유령' : '보스 · 저택의 괘종시계', panes: (bb.animations || []).map(an => ({ label: an.name, kind: 'model', model: bb, anim: an.name.split('.').pop(), yaw: -35 })) });
}
fs.mkdirSync('out/pg', { recursive: true });
fs.writeFileSync('out/pg/report.txt', report.join('\n'));
console.log(report.join('\n'));
buildViewer({ skin, sections }, 'out/pg/poltergeist.html', { inlineThree: true, title: 'Poltergeist · Atelier' });
