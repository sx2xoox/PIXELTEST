// 피의 군주 비교 뷰어(언블라인드): 일반 Claude vs Atelier를 항목마다 나란히
import fs from 'fs';
import { loadSide, sectionsFor } from './b2data.mjs';
import { buildViewer } from '../atelier/viewer/build.mjs';
const sides = { '일반 Claude': loadSide('bench2/baseline'), 'Atelier': loadSide('bench2/atelier') };
const skin = `data:image/png;base64,${fs.readFileSync('bench2/default_skin.png').toString('base64')}`;
const desc = JSON.parse(fs.readFileSync('out/b2/section-desc.json', 'utf8'));
const sections = sectionsFor(sides).map(s => ({ ...s, desc: desc[s.id] || '' }));
const sub = '같은 브리프로 일반 Claude(자체 제작 도구, Atelier 미사용)와 Atelier가 각각 만든 피의 군주 에셋. 두 쪽 모두 브리프 형식 원본 파일(.bbmodel, PNG, timeline.json)을 같은 뷰어가 직접 읽어 렌더합니다. 각 칸은 드래그로 회전, 휠로 확대, 아래에서 재생·속도·애니메이션·실루엣을 바꿀 수 있습니다.';
buildViewer({ skin, sections }, 'out/viewer/blood-lord.html', { title: '피의 군주 비교', subtitle: sub });
console.log((fs.statSync('out/viewer/blood-lord.html').size / 1e6).toFixed(2) + 'MB');
