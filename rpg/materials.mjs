// RPG 서버 재료 시연: 지역 2곳(피의 땅 · 유령 저택) × 재료 10종. 이 목록만 바꾸면 아이콘·리소스팩·명령어·미리보기가 다시 나온다.
//   node rpg/materials.mjs && node rpg/weapons.mjs   → rpg/out/pack/ (리소스팩: 재료 + 무기), rpg/out/give.txt, rpg/out/preview.html, rpg/out/icons.png  (materials가 rpg/out을 새로 만드므로 순서 지킬 것)
import fs from 'fs';
import { buildItems, writePack, previewHTML } from '../atelier/mc/rpgitems.js';
import { PixelCanvas } from '../atelier/pixel.js';
import { regionPalette, harmonyReport } from '../atelier/mc/palette.js';
import { BLOOD_SPEC, GHOST_SPEC } from './palettes.mjs';

const NS = 'rpg';
// 지역마다 팔레트(공유 잉크·빛 + 역할)를 정하고, 아이템은 hex가 아니라 역할 이름으로 색을 고른다 → 세트 색 조화(atelier/mc/palette.js)
export const REGIONS = [
  {
    title: '피의 땅 — 흡혈 귀족의 영지',
    note: '역할: 진홍(주 60%) · 와인(보조) · 금(강조, 화폐만) · 뼈. 모든 외곽선은 같은 검붉은 잉크, 모든 반짝임은 같은 따뜻한 빛.',
    palette: BLOOD_SPEC,
    items: [
      { id: 'blood_shard', name: '혈석 파편', family: 'shard', color: 'primary', tier: 1, desc: ['굳은 피가 결정이 된 조각.'], source: '피의 땅 · 모든 몹' },
      { id: 'clotted_dust', name: '응고된 피 가루', family: 'dust', color: 'secondary', tier: 1, desc: ['갈아 낸 혈석. 정제의 기본 재료.'], source: '혈석 파편 분쇄' },
      { id: 'bat_fang', name: '흡혈 박쥐의 송곳니', family: 'fang', color: 'bone', tier: 2, desc: ['아직 피 냄새가 남아 있다.'], source: '흡혈 박쥐' },
      { id: 'crimson_scale', name: '진홍 비늘', family: 'scale', color: 'secondary', tier: 2, desc: ['피의 늪 도마뱀의 비늘.'], source: '늪 도마뱀' },
      { id: 'crimson_ingot', name: '진홍 주괴', family: 'ingot', color: 'primary', tier: 3, desc: ['혈석을 녹여 부은 주괴.', '무기 제작에 쓰인다.'], source: '대장간 정제' },
      { id: 'blood_essence', name: '피의 정수', family: 'essence', color: 'primary', tier: 3, desc: ['병 안에서 아직 맥박이 뛴다.'], source: '혈마술사' },
      { id: 'bloodmoon_gem', name: '혈월 보석', family: 'gem', color: 'primary', tier: 4, desc: ['핏빛 달이 뜬 밤에만 맺힌다.'], source: '혈월 이벤트' },
      { id: 'lord_heart', name: '군주의 심장석', family: 'orb', color: 'primary', tier: 5, desc: ['피의 군주가 남긴 심장.', '전설 장비의 핵.'], source: '보스 · 피의 군주' },
      { id: 'blood_stone', name: '혈흔 강화석', family: 'stone', color: 'primary', tier: 3, type: '강화 재료', desc: ['장비 강화 +1 ~ +5.'], source: '상점 · 혈화 50' },
      { id: 'blood_coin', name: '혈화', family: 'coin', color: 'accent', tier: 2, type: '화폐', desc: ['피의 땅에서 통용되는 금화.'], source: '퀘스트 보상' },
      { id: 'blood_potion', name: '선혈 물약', family: 'essence', color: 'primary', tier: 2, type: '소모품', desc: ['체력을 즉시 회복한다.'], source: '상점 · 혈화 5' },
      { id: 'blood_scroll', name: '흡혈 주문서', family: 'scroll', color: 'secondary', tier: 3, type: '소모품', desc: ['30초 동안 공격의 5%를 흡혈.'], source: '혈마술사' },
      { id: 'lord_tome', name: '군주의 비서', family: 'tome', color: 'secondary', tier: 4, type: '스킬북', desc: ['피의 군주 스킬 「혈월」을 배운다.'], source: '보스 · 피의 군주' },
    ],
  },
  {
    title: '유령 저택 — 소란의 망령이 사는 곳',
    note: '역할: 민트(주) · 라벤더(보조) · 바랜 황동(강조) · 백랍·촛농(지역 색에 물든 중성). 외곽선은 같은 남보라 잉크, 반짝임은 같은 차가운 빛.',
    palette: GHOST_SPEC,
    items: [
      { id: 'pewter_scrap', name: '백랍 조각', family: 'nugget', color: 'metal', tier: 1, desc: ['부서진 촛대에서 떨어진 조각.'], source: '유령 저택 · 모든 몹' },
      { id: 'ghost_wax', name: '유령 촛농', family: 'dust', color: 'wax', tier: 1, desc: ['식어도 희미하게 빛난다.'], source: '촛대 유령' },
      { id: 'pewter_ingot', name: '백랍 주괴', family: 'ingot', color: 'metal', tier: 2, desc: ['저택 은식기를 녹인 주괴.'], source: '대장간 정제' },
      { id: 'ectoplasm', name: '엑토플라즘 병', family: 'essence', color: 'primary', tier: 2, desc: ['병마개를 열면 속삭임이 들린다.'], source: '찻주전자 유령' },
      { id: 'mansion_key', name: '녹슨 저택 열쇠', family: 'rod', color: 'accent', tier: 2, type: '퀘스트', stack: 1, desc: ['잠긴 서재를 연다.'], source: '집사의 망령' },
      { id: 'soul_crystal', name: '영혼 결정', family: 'shard', color: 'primary', tier: 3, desc: ['망령이 흩어지며 남긴 결정.'], source: '유령 저택 지하' },
      { id: 'scream_orb', name: '비명 구슬', family: 'orb', color: 'secondary', tier: 4, desc: ['귀에 대면 비명이 들린다.'], source: '비명 지르는 망령' },
      { id: 'clock_gear', name: '괘종시계 태엽 톱니', family: 'coin', color: 'accent', tier: 4, desc: ['아직 째깍거린다.'], source: '보스 · 저택의 괘종시계' },
      { id: 'phantom_gem', name: '망령의 눈물', family: 'gem', color: 'primary', tier: 5, desc: ['저택의 주인이 흘린 마지막 눈물.'], source: '보스 · 저택의 괘종시계' },
      { id: 'ecto_stone', name: '망령 강화석', family: 'stone', color: 'primary', tier: 4, type: '강화 재료', desc: ['장비 강화 +6 ~ +10.'], source: '엑토플라즘 10 + 영혼 결정 3' },
      { id: 'ecto_potion', name: '엑토 물약', family: 'essence', color: 'primary', tier: 2, type: '소모품', desc: ['10초 동안 몸이 반투명해진다.'], source: '상점' },
      { id: 'return_scroll', name: '귀환 주문서', family: 'scroll', color: 'secondary', tier: 2, type: '소모품', desc: ['저택 입구로 돌아간다.'], source: '집사의 망령' },
      { id: 'butler_journal', name: '집사의 일지', family: 'tome', color: 'secondary', tier: 4, type: '스킬북', desc: ['폴터가이스트 스킬 「소란」을 배운다.'], source: '보스 · 저택의 괘종시계' },
    ],
  },
];

const regions = REGIONS.map(r => ({ ...r, items: buildItems(NS, r.items, regionPalette(r.palette)) }));
for (const r of regions) console.log(r.title.split(' ')[0], r.title.split(' ')[1], harmonyReport(r.items.map(d => d.icon)));
const all = regions.flatMap(r => r.items);
fs.rmSync('rpg/out', { recursive: true, force: true });
writePack('rpg/out/pack', NS, all, { description: 'RPG 재료 시연 — 피의 땅 · 유령 저택' });
fs.writeFileSync('rpg/out/give.txt', all.map(d => `# ${d.name} (${d.id})\n[1.21.4]  ${d.give.v1_21_4}\n[1.21.5+] ${d.give.v1_21_5}\n`).join('\n'));
fs.writeFileSync('rpg/out/preview.html', previewHTML('RPG 재료 시연 · Atelier', regions));
// 아이콘 시트(4배)
const sheet = new PixelCanvas(13 * 18, regions.length * 18); sheet.fill('#2a2a33');
regions.forEach((r, j) => r.items.forEach((d, i) => sheet.paste(d.icon, i * 18 + 1, j * 18 + 1)));
fs.writeFileSync('rpg/out/icons.png', sheet.scale(6).toPNG());
console.log('items', all.length);
