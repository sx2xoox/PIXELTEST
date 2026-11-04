// 피의 군주(Atelier) 빌드: 브리프 규약 경로로 산출물을 쓰고, 확인용 로컬 뷰어를 만든다
//   node bench2/atelier/src/build.mjs [weapon armor fx pet boss ...]
import fs from 'fs';
import path from 'path';
import { compileModel } from '../../../atelier/mc/model.js';
import { toModelEngine, lintModelEngine } from '../../../atelier/mc/export.js';
import { buildViewer } from '../../../atelier/viewer/build.mjs';

const OUT = 'bench2/atelier';
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
  return bb;
}
const sections = [];
const skin = 'data:image/png;base64,' + fs.readFileSync('bench2/default_skin.png').toString('base64');

let weaponBB = null;
if (want('weapon') || want('fx') || want('armor')) {
  const w = await import('./weapon.mjs');
  weaponBB = model({ ...w.default(), role: 'item' }, 'weapon/blood_scythe.bbmodel');
  write('weapon/blood_scythe.png', w.icon().toPNG());
  if (want('weapon')) sections.push({ id: 'weapon', title: '무기', panes: [
    { label: '혈익낫', kind: 'model', model: weaponBB, yaw: -70, pitch: 10 },
    { label: '손에 든 모습', kind: 'player', weapon: weaponBB, yaw: -40 },
    { label: '아이콘', kind: 'textures', textures: [{ name: '16×16', src: w.icon().scale(12).toDataURL(), w: 192 }] },
  ] });
}
let armor = null;
if (want('armor') || want('fx')) {
  const a = await import('./armor.mjs');
  const r = a.default();
  write('armor/humanoid.png', r.humanoid.toPNG()); write('armor/humanoid_leggings.png', r.leggings.toPNG());
  for (const [k, c] of Object.entries(r.icons)) write(`armor/icons/${k}.png`, c.toPNG());
  armor = { humanoid: r.humanoid.toDataURL(), leggings: r.leggings.toDataURL() };
  report.push(`■ armor colors humanoid ${r.humanoid.colors().size} · leggings ${r.leggings.colors().size}`);
  if (want('armor')) sections.push({ id: 'armor', title: '갑옷', panes: [
    { label: '착용', kind: 'player', armor, weapon: weaponBB, yaw: -30 },
    { label: '텍스처·아이콘', kind: 'textures', textures: [{ name: 'humanoid', src: r.humanoid.scale(5).toDataURL(), w: 320 }, { name: 'leggings', src: r.leggings.scale(5).toDataURL(), w: 320 }, ...Object.entries(r.icons).map(([k, c]) => ({ name: k, src: c.scale(8).toDataURL(), w: 96 }))] },
  ] });
}
if (want('fx')) {
  const f = await import('./fx.mjs');
  for (const kind of ['basic_attack', 'skill']) {
    const { timeline, frames } = f[kind]();
    write(`fx/${kind}/timeline.json`, JSON.stringify(timeline, null, 2));
    const urls = {};
    for (const [n, c] of Object.entries(frames)) { write(`fx/${kind}/${n}`, c.toPNG()); urls[n] = c.toDataURL(); }
    sections.push({ id: kind, title: kind, panes: [{ label: timeline.name, kind: 'fx', timeline, frames: urls, weapon: weaponBB, armor, yaw: -40, pitch: 20 }] });
  }
}
for (const [k, file, anim] of [['pet', 'pet/pet.bbmodel', 'walk'], ['boss', 'boss/boss.bbmodel', 'attack']]) {
  if (!want(k)) continue;
  const mod = await import(`./${k}.mjs`);
  const bb = model(mod.default(), file);
  sections.push({ id: k, title: k, panes: (bb.animations || []).map(a => ({ label: a.name, kind: 'model', model: bb, anim: a.name.split('.').pop(), yaw: -35 })) });
}
fs.writeFileSync('out/b2/report.txt', report.join('\n'));
console.log(report.join('\n'));
buildViewer({ skin, sections }, 'out/b2/atelier.local.html', { inlineThree: true, title: 'Blood Lord · Atelier' });
