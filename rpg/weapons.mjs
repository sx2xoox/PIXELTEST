// 직업 무기 → 리소스팩(1.21.4+, 플러그인 없이). 손에도 칸에도 같은 3D 모델(칸에서는 옆모습을 45° 대각선으로, javaitem.js fitGui)
//   node rpg/weapons.mjs   → rpg/out/pack/ 에 추가(재료 팩과 같은 팩), rpg/out/weapons_give.txt, rpg/out/weapons_gui.png
import fs from 'fs';
import path from 'path';
import { compileModel } from '../atelier/mc/model.js';
import { toJavaItem, itemDefinition } from '../atelier/mc/javaitem.js';
import { renderGui } from '../atelier/mc/guirender.js';
import { close } from '../atelier/render.js';

const NS = 'rpg', DIR = 'rpg/out/pack';
export const WEAPONS = [
  { id: 'blood_scythe', name: '혈익낫', src: '../bench2/atelier/src/weapon.mjs', rarity: 'gold' },
  { id: 'uproar_candelabra', name: '소란의 촛대', src: '../classes/poltergeist/src/weapon.mjs', rarity: 'gold' },
];
const w = (p, d) => { fs.mkdirSync(path.dirname(path.join(DIR, p)), { recursive: true }); fs.writeFileSync(path.join(DIR, p), d); };
const renders = [], give = [];
for (const W of WEAPONS) {
  const mod = await import(W.src);
  const m = compileModel({ ...mod.default(), role: 'item' });
  const full = toJavaItem(m, { ns: NS, name: W.id });
  for (const i of full.issues.filter(i => i.severity === 'error')) console.log('[error]', W.id, i.msg);
  w(`assets/${NS}/textures/item/${W.id}.png`, m.atlas.toPNG());
  w(`assets/${NS}/models/item/${W.id}.json`, JSON.stringify(full.model));
  w(`assets/${NS}/items/${W.id}.json`, JSON.stringify(itemDefinition(NS, W.id), null, 2));
  give.push(`# ${W.name} (${W.id})\n/give @p minecraft:netherite_sword[minecraft:item_model="${NS}:${W.id}",minecraft:item_name={text:"${W.name}",color:"${W.rarity}",italic:false},minecraft:custom_data={${NS}:{id:"${W.id}"}}] 1`);
  renders.push({ model: full.model, texture: m.atlas.toDataURL() });
}
// 칸 미리보기(GUI 배율 3 = 48px)
const shots = await renderGui(renders, { px: 48 });
await close();
fs.writeFileSync('rpg/out/weapons_give.txt', give.join('\n\n') + '\n');
fs.mkdirSync('rpg/out/weapons_gui', { recursive: true });
shots.forEach((png, i) => fs.writeFileSync(`rpg/out/weapons_gui/${WEAPONS[i].id}.png`, png));
console.log('weapons', WEAPONS.length, 'files ok');
