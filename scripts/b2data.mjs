// 비교 과제 2: 한쪽 산출물 폴더(브리프 형식 파일만)를 뷰어 섹션 데이터로 바꾼다. 양쪽에 똑같이 적용된다.
import fs from 'fs';
import path from 'path';

const exists = p => fs.existsSync(p);
const url = p => `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));

export function loadSide(dir) {
  const r = { missing: [] };
  const need = (rel, fn) => { const p = path.join(dir, rel); if (!exists(p)) { r.missing.push(rel); return null; } try { return fn(p); } catch (e) { r.missing.push(`${rel} (읽기 실패: ${e.message})`); return null; } };
  r.weapon = need('weapon/blood_scythe.bbmodel', json);
  r.weaponIcon = exists(path.join(dir, 'weapon/blood_scythe.png')) ? url(path.join(dir, 'weapon/blood_scythe.png')) : null;
  r.armor = { humanoid: need('armor/humanoid.png', url), leggings: need('armor/humanoid_leggings.png', url) };
  r.icons = Object.fromEntries(['helmet', 'chestplate', 'leggings', 'boots'].map(k => [k, need(`armor/icons/${k}.png`, url)]));
  for (const k of ['basic_attack', 'skill']) {
    r[k] = need(`fx/${k}/timeline.json`, p => {
      const tl = json(p);
      const frames = {};
      for (const tr of tl.tracks || []) for (const f of tr.frames || []) { const fp = path.join(path.dirname(p), f); if (exists(fp)) frames[f] = url(fp); else r.missing.push(`fx/${k}/${f}`); }
      return { timeline: tl, frames };
    });
  }
  r.pet = need('pet/pet.bbmodel', json);
  r.boss = need('boss/boss.bbmodel', json);
  return r;
}

const animShort = a => a.name.split('.').pop();
/** 섹션 데이터: 비교(두 쪽) 또는 한 쪽 */
export function sectionsFor(sides) {
  const L = Object.keys(sides);
  const S = k => L.map(l => [l, sides[l]]);
  const sec = [];
  sec.push({ id: 'weapon', title: '3D 무기 · 피의 낫', panes: S().flatMap(([l, s]) => s.weapon ? [
    { label: `${l} · 모델`, kind: 'model', model: s.weapon, yaw: -70, pitch: 10 },
    { label: `${l} · 손에 든 모습`, kind: 'player', weapon: s.weapon, yaw: -40 },
  ] : []) });
  sec.push({ id: 'armor', title: '갑옷 풀세트', panes: S().flatMap(([l, s]) => [
    { label: `${l} · 착용`, kind: 'player', armor: s.armor.humanoid ? s.armor : null, weapon: s.weapon, yaw: -30 },
    { label: `${l} · 텍스처·아이콘`, kind: 'textures', textures: [
      ...(s.armor.humanoid ? [{ name: 'humanoid 64×32', src: s.armor.humanoid, w: 320 }] : []),
      ...(s.armor.leggings ? [{ name: 'leggings 64×32', src: s.armor.leggings, w: 320 }] : []),
      ...Object.entries(s.icons).filter(([, v]) => v).map(([k, v]) => ({ name: k, src: v, w: 96 })),
      ...(s.weaponIcon ? [{ name: '낫 아이콘', src: s.weaponIcon, w: 96 }] : []),
    ] },
  ]) });
  for (const [k, title] of [['basic_attack', '기본 공격 3연타'], ['skill', '스킬']])
    sec.push({ id: k, title, panes: S().filter(([, s]) => s[k]).map(([l, s]) => ({ label: `${l}`, note: s[k].timeline.name, kind: 'fx', timeline: s[k].timeline, frames: s[k].frames, weapon: s.weapon, armor: s.armor.humanoid ? s.armor : null, yaw: -40, pitch: 22 })) });
  for (const [k, title] of [['pet', '펫'], ['boss', '보스']])
    sec.push({ id: k, title, panes: S().filter(([, s]) => s[k]).flatMap(([l, s]) => {
      const anims = s[k].animations || [];
      const pick = n => anims.find(a => animShort(a) === n) ? n : (anims[0] ? animShort(anims[0]) : undefined);
      return [{ label: `${l} · ${k === 'boss' ? 'attack' : 'walk'}`, kind: 'model', model: s[k], anim: pick(k === 'boss' ? 'attack' : 'walk'), yaw: -35 }];
    }) });
  return sec;
}
