// 직업 무기 → 리소스팩(1.21.4+, 플러그인 없이). 손에 든 모습 = 3D 모델, 칸 아이콘 = 모드에 따라 3D/칸 전용 3D/2D
//   node rpg/weapons.mjs   → rpg/out/pack/ 에 추가(재료 팩과 같은 팩), rpg/out/weapons_give.txt, rpg/out/weapons_gui.png
import fs from 'fs';
import path from 'path';
import { compileModel } from '../atelier/mc/model.js';
import { toJavaItem, itemDefinition } from '../atelier/mc/javaitem.js';
import { renderGui } from '../atelier/mc/guirender.js';
import { close } from '../atelier/render.js';
import { PixelCanvas } from '../atelier/pixel.js';

const NS = 'rpg', DIR = 'rpg/out/pack';
// squash: 칸 전용 모델에서 자루(y < below)를 k배로 — 머리를 크게 보이게
export const WEAPONS = [
  { id: 'blood_scythe', name: '혈익낫', src: '../bench2/atelier/src/weapon.mjs', mode: '3d-gui', squash: { below: 24, k: 0.3 }, rarity: 'gold' },
  { id: 'uproar_candelabra', name: '소란의 촛대', src: '../classes/poltergeist/src/weapon.mjs', mode: '3d-gui', squash: { below: 18, k: 0.3 }, rarity: 'gold' },
];
const w = (p, d) => { fs.mkdirSync(path.dirname(path.join(DIR, p)), { recursive: true }); fs.writeFileSync(path.join(DIR, p), d); };
const renders = [], give = [];
for (const W of WEAPONS) {
  const mod = await import(W.src);
  const m = compileModel({ ...mod.default(), role: 'item' });
  const full = toJavaItem(m, { ns: NS, name: W.id }), gui = toJavaItem(m, { ns: NS, name: W.id, squash: W.squash });
  for (const i of [...full.issues, ...gui.issues].filter(i => i.severity === 'error')) console.log('[error]', W.id, i.msg);
  w(`assets/${NS}/textures/item/${W.id}.png`, m.atlas.toPNG());
  w(`assets/${NS}/models/item/${W.id}.json`, JSON.stringify(full.model));
  w(`assets/${NS}/models/item/${W.id}_gui.json`, JSON.stringify(gui.model));
  const icon2d = mod.icon();
  w(`assets/${NS}/textures/item/${W.id}_icon.png`, icon2d.toPNG());
  w(`assets/${NS}/models/item/${W.id}_icon.json`, JSON.stringify({ parent: 'minecraft:item/handheld', textures: { layer0: `${NS}:item/${W.id}_icon` } }));
  w(`assets/${NS}/items/${W.id}.json`, JSON.stringify(itemDefinition(NS, W.id, { mode: W.mode }), null, 2));
  give.push(`# ${W.name} (${W.id}) — 칸 표시: ${W.mode}\n/give @p minecraft:netherite_sword[minecraft:item_model="${NS}:${W.id}",minecraft:item_name={text:"${W.name}",color:"${W.rarity}",italic:false},minecraft:custom_data={${NS}:{id:"${W.id}"}}] 1`);
  renders.push({ model: full.model, texture: m.atlas.toDataURL() }, { model: gui.model, texture: m.atlas.toDataURL() }, { icon2d });
}
// 칸 미리보기(GUI 배율 3 = 48px): 무기마다 [3D 그대로 · 칸 전용 3D · 2D]
const shots = await renderGui(renders.filter(r => r.model), { px: 48 });
await close();
fs.writeFileSync('rpg/out/weapons_give.txt', give.join('\n\n') + '\n');
let si = 0;
const cols = renders.map(r => (r.model ? { png: shots[si++] } : { canvas: r.icon2d.scale(3) }));
fs.mkdirSync('rpg/out/weapons_gui', { recursive: true });
cols.forEach((c, i) => fs.writeFileSync(`rpg/out/weapons_gui/${WEAPONS[(i / 3) | 0].id}_${['3d', '3d_gui', '2d'][i % 3]}.png`, c.png ?? c.canvas.toPNG()));
console.log('weapons', WEAPONS.length, 'files ok');
