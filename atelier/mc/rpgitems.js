// RPG 아이템 세트 빌더: 재료 정의 목록 → 아이콘 PNG + 리소스팩(1.21.4+, 플러그인 없이 item_model) + /give 명령어 + 게임 화면 미리보기 HTML
// 정의 예: { id:'blood_shard', name:'혈석 파편', family:'shard', color:'#c0283c', tier:1, type:'재료', desc:['굳은 피가 결정이 된 조각.'], source:'피의 땅 · 흡혈 박쥐' }
import fs from 'fs';
import path from 'path';
import { icon, RARITY } from './items.js';
import { setRamp } from './palette.js';

const esc = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const loreLines = d => [
  { text: `◆ ${d.type ?? '재료'}`, color: 'gray' },
  { text: '' },
  ...(d.desc ?? []).map(t => ({ text: t, color: 'gray' })),
  ...(d.source ? [{ text: '' }, { text: `획득처: ${d.source}`, color: 'dark_gray' }] : []),
  { text: '' },
  { text: `${'★'.repeat(d.tier)}${'☆'.repeat(5 - d.tier)} ${RARITY[d.tier - 1].ko}`, color: RARITY[d.tier - 1].mc },
];

/** /give 명령어: 1.21.4(텍스트 컴포넌트를 JSON 문자열로) / 1.21.5+(SNBT 텍스트 컴포넌트) */
export function giveCommands(ns, d) {
  const r = RARITY[d.tier - 1];
  const vanillaRarity = ['common', 'uncommon', 'rare', 'epic', 'epic'][d.tier - 1];
  const lore = loreLines(d);
  const j = o => JSON.stringify({ ...o, italic: false });
  const extra = `,minecraft:custom_data={${ns}:{id:"${d.id}",tier:${d.tier}}}${d.stack ? `,minecraft:max_stack_size=${d.stack}` : ''}`;   // 플러그인·데이터팩이 식별할 ID(이름이 아니라 ID로 판정)
  const v4 = `/give @p minecraft:paper[minecraft:item_model="${ns}:${d.id}",minecraft:item_name='${j({ text: d.name, color: r.mc })}',minecraft:lore=[${lore.map(l => `'${j(l)}'`).join(',')}],minecraft:rarity="${vanillaRarity}"${d.tier >= 5 ? ',minecraft:enchantment_glint_override=true' : ''}${extra}] ${d.count ?? 1}`;
  const snbt = o => `{text:"${esc(o.text)}"${o.color ? `,color:"${o.color}"` : ''},italic:false}`;
  const v5 = `/give @p minecraft:paper[minecraft:item_model="${ns}:${d.id}",minecraft:item_name=${snbt({ text: d.name, color: r.mc })},minecraft:lore=[${lore.map(snbt).join(',')}],minecraft:rarity="${vanillaRarity}"${d.tier >= 5 ? ',minecraft:enchantment_glint_override=true' : ''}${extra}] ${d.count ?? 1}`;
  return { v1_21_4: v4, v1_21_5: v5 };
}

/** 리소스팩 파일들 쓰기(텍스처 + 아이템 정의 + 모델 + pack.mcmeta) */
export function writePack(dir, ns, items, { description = 'RPG materials' } = {}) {
  const w = (p, data) => { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), data); };
  w('pack.mcmeta', JSON.stringify({ pack: { description, pack_format: 46, min_format: 46, max_format: [97, 1] } }, null, 2));
  for (const d of items) {
    w(`assets/${ns}/textures/item/${d.id}.png`, d.icon.toPNG());
    w(`assets/${ns}/models/item/${d.id}.json`, JSON.stringify({ parent: 'minecraft:item/generated', textures: { layer0: `${ns}:item/${d.id}` } }, null, 2));
    w(`assets/${ns}/items/${d.id}.json`, JSON.stringify({ model: { type: 'minecraft:model', model: `${ns}:item/${d.id}` } }, null, 2));
  }
}

/** 정의 목록 → 아이콘 생성 + 명령어 */
// pal(palette.js regionPalette)을 주면 d.color는 역할 이름('primary'·'secondary'·'accent'·'bone'·'metal' …)이다 → 세트 색 조화가 보장된다.
// 같은 역할 = 같은 램프(바닐라처럼 재질 하나에 팔레트 하나). 등급은 채도 2단계 + 밝기·반짝임·별 장식으로 나타낸다.
export function buildItems(ns, defs, pal) {
  return defs.map((d, i) => {
    let opt = { color: d.color, tier: d.tier, seed: i + 1 };
    if (pal) {
      const role = pal.roles[d.color]; if (!role) throw new Error(`역할 없음: ${d.color} (${d.id})`);
      opt = { ...opt, pal, ramp: setRamp(pal, d.tier <= 2 ? { ...role, chroma: role.chroma * 0.72 } : role) };   // 채도 = 희귀도: 1~2등급은 바랜 원재료 램프, 3등급 이상은 순수 램프(역할당 램프 2개만 → 세트가 색을 공유)
    }
    return { ...d, icon: icon(d.family, opt), give: giveCommands(ns, d) };
  });
}

/**
 * 게임 화면 미리보기 HTML: 인벤토리 슬롯(GUI 배율 3) + 각 아이템 툴팁(바닐라 툴팁 색·테두리, 한글은 실제 게임과 같은 Unifont)
 */
export function previewHTML(title, groups) {
  const MC = { white: '#ffffff', green: '#55ff55', blue: '#5555ff', dark_purple: '#aa00aa', gold: '#ffaa00', gray: '#aaaaaa', dark_gray: '#555555' };
  const shadow = hex => { const n = parseInt(hex.slice(1), 16); return `rgb(${((n >> 16) & 255) >> 2},${((n >> 8) & 255) >> 2},${(n & 255) >> 2})`; };
  const line = (t, c) => `<div class="l" style="color:${MC[c] ?? c};text-shadow:3px 3px 0 ${shadow(MC[c] ?? c)}">${t ? t.replace(/&/g, '&amp;').replace(/</g, '&lt;') : '&nbsp;'}</div>`;
  const tip = d => `<div class="tip"><div class="in">${line(d.name, RARITY[d.tier - 1].mc)}${loreLines(d).map(l => line(l.text, l.color ?? 'white')).join('')}</div></div>`;
  const slots = items => `<div class="inv">${Array.from({ length: 27 }, (_, i) => `<div class="slot">${items[i] ? `<img src="${items[i].icon.toDataURL()}">` : ''}</div>`).join('')}</div>`;
  const css = `body{margin:0;background:#1b1b22;color:#ddd;font:15px Pretendard,sans-serif;padding:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 10px;color:#ffd27a}p{margin:4px 0;color:#aab}
.row{display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap}
.inv{display:grid;grid-template-columns:repeat(9,54px);gap:0;background:#c6c6c6;padding:12px;border:3px solid #fff;border-right-color:#555;border-bottom-color:#555;width:max-content}
.slot{width:48px;height:48px;background:#8b8b8b;border:3px solid #373737;border-right-color:#fff;border-bottom-color:#fff;display:flex;align-items:center;justify-content:center}
.slot img{width:48px;height:48px;image-rendering:pixelated}
.tips{display:flex;flex-wrap:wrap;gap:14px;margin-top:14px}
.tip{background:rgba(16,0,16,.94);padding:3px;border-radius:0}
.tip .in{border:3px solid;border-image:linear-gradient(#5000ff,#28007f) 1;padding:6px 9px 4px;font-family:Unifont,monospace;font-size:24px;line-height:30px;-webkit-font-smoothing:none}
.l{white-space:pre}
.card{display:flex;gap:10px;align-items:center;background:#24242c;padding:8px 10px;border-radius:6px}
.card img{width:64px;height:64px;image-rendering:pixelated}
code{display:block;white-space:pre-wrap;word-break:break-all;background:#101016;color:#9fe;padding:8px;border-radius:6px;font:12px JetBrains Mono,monospace;max-width:1100px}`;
  const body = groups.map(g => `<h2>${g.title}</h2><p>${g.note ?? ''}</p><div class="row">${slots(g.items)}<div style="display:grid;grid-template-columns:repeat(5,64px);gap:6px">${g.items.map(d => `<img src="${d.icon.toDataURL()}" title="${d.name}" style="width:64px;height:64px;image-rendering:pixelated;background:#2a2a33">`).join('')}</div></div><div class="tips">${g.items.map(tip).join('')}</div>`).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body><h1>${title}</h1>${body}</body></html>`;
}
