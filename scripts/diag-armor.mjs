// 갑옷 착용 정면·3/4 확인용 페이지(현재 텍스처로 매번 새로 만든다)
import fs from 'fs';
import { buildViewer } from '../atelier/viewer/build.mjs';
const u = p => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const dir = process.argv[2] || 'bench2/atelier';
const armor = { humanoid: u(`${dir}/armor/humanoid.png`), leggings: u(`${dir}/armor/humanoid_leggings.png`) };
buildViewer({ skin: u('bench2/default_skin.png'), sections: [{ id: 'a', title: 'a', panes: [{ label: 'front', kind: 'player', armor, yaw: 0, pitch: 0 }, { label: 'back', kind: 'player', armor, yaw: 160, pitch: 10 }] }] }, 'out/b2/diag.local.html', { inlineThree: true });
