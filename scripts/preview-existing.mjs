// 지금까지 만든 마인크래프트 테스트 결과물 미리보기(뷰어 아티팩트) 생성
import fs from 'fs';
import { buildViewer, dataURL } from '../atelier/viewer/build.mjs';
import * as V from '../atelier/mc/vfx.js';

const O = 'out/reg';
const bb = n => JSON.parse(fs.readFileSync(`${O}/${n}.bbmodel`, 'utf8'));
const png = f => dataURL(f);
const framesOf = (name, list) => Object.fromEntries(list.map((c, i) => [`${name}_${i}.png`, c.toDataURL()]));
const names = (name, n) => Array.from({ length: n }, (_, i) => `${name}_${i}.png`);

const slash = V.slashArc({ size: 32, frames: 6 }), ring = V.shockRing({ size: 32, frames: 6 }), spark = V.hitSpark({ size: 16, frames: 4 });
const circle = V.magicCircle({ size: 64, frames: 8, seed: 5 }), beamF = V.beam({ w: 16, h: 64, frames: 4 });
const fxTimeline = {
  name: '이펙트 데모: 베기 → 타격 스파크 → 충격파, 바닥 마법진, 루트 빔', duration_ticks: 40,
  tracks: [
    { id: 'circle', frames: names('circle', 8), ticks_per_frame: 3, start_tick: 0, end_tick: 40, size: [4, 4], tint: '#a77bff', keys: [{ tick: 0, translation: [0, 0.02, 0], rotation: [-90, 0, 0], scale: [1, 1, 1] }] },
    { id: 'slash', frames: names('slash', 6), ticks_per_frame: 1, start_tick: 4, end_tick: 10, size: [3, 3], tint: '#8fd8ff', keys: [{ tick: 4, translation: [0, 1.3, -1.4], rotation: [0, 0, 20], scale: [1, 1, 1] }] },
    { id: 'spark', frames: names('spark', 4), ticks_per_frame: 1, start_tick: 8, end_tick: 12, size: [1, 1], billboard: 'center', tint: '#ffe9a0', keys: [{ tick: 8, translation: [0.2, 1.3, -2], scale: [1, 1, 1] }] },
    { id: 'ring', frames: names('ring', 6), ticks_per_frame: 2, start_tick: 10, end_tick: 22, size: [3, 3], tint: '#ff8a3c', keys: [{ tick: 10, translation: [0, 0.05, -2], rotation: [-90, 0, 0], scale: [0.6, 0.6, 1] }, { tick: 22, scale: [1.6, 1.6, 1] }] },
    { id: 'beam', frames: names('beam', 4), ticks_per_frame: 2, start_tick: 0, end_tick: 40, size: [0.6, 2.4], billboard: 'vertical', tint: '#8be36a', keys: [{ tick: 0, translation: [2, 1.2, -1], scale: [1, 1, 1] }] },
  ],
  player: [{ tick: 0, arm_r: [0, 0, 0] }, { tick: 3, arm_r: [-150, -20, 0], body: [0, 25, 0] }, { tick: 7, arm_r: [-40, 30, 0], body: [0, -20, 0] }, { tick: 14, arm_r: [-20, 0, 0], body: [0, 0, 0] }, { tick: 40, arm_r: [0, 0, 0] }],
};
const frames = { ...framesOf('slash', slash), ...framesOf('ring', ring), ...framesOf('spark', spark), ...framesOf('circle', circle), ...framesOf('beam', beamF) };

const tex = (dir, list, w = 128) => list.map(n => ({ name: n, src: png(`${dir}/${n}.png`), w }));
const data = {
  skin: png('out/mc/forest_ranger.skin.png'),
  sections: [
    { id: 'entities', title: '엔티티', desc: '실제 .bbmodel 파일을 그대로 읽어 렌더합니다. 드래그로 회전, 휠로 확대, 아래에서 애니메이션과 실루엣을 바꿀 수 있습니다.', panes: [
      { label: '이끼 정령', kind: 'model', model: bb('mossling'), anim: 'walk', desc: '머리 > 몸 > 팔다리 명도 3단, 교차 평면 새싹, 걷기 애니메이션' },
      { label: '숲 레인저 (스킨)', kind: 'model', model: bb('forest_ranger'), anim: 'walk', desc: '64×64 스킨: 후드·망토 오버레이, 입체 음영과 주름' },
    ] },
    { id: 'armor', title: '갑옷 착용', desc: '베르다이트 판금 갑옷(64×32 두 장)을 스킨 위에 바닐라와 같은 부풀림·좌우 미러로 입힌 모습', panes: [
      { label: '베르다이트 판금', kind: 'model', model: bb('forest_ranger_armored'), anim: 'walk' },
      { label: '갑옷 텍스처', kind: 'textures', textures: [{ name: 'humanoid (64×32)', src: png('out/mc/verdite.humanoid.png'), w: 320 }, { name: 'humanoid_leggings', src: png('out/mc/verdite.humanoid_leggings.png'), w: 320 }, { name: '스킨 64×64', src: png('out/mc/forest_ranger.skin.png'), w: 256 }] },
    ] },
    { id: 'blocks', title: '블록 모델', desc: '게임과 같은 면 음영(위 1.0 · 남북 0.8 · 동서 0.6 · 아래 0.5). 울타리는 모든 연결 부품을 함께 보여 줍니다.', panes: [
      { label: '랜턴 기둥', kind: 'model', model: bb('lantern_post'), yaw: -40 },
      { label: '벽걸이 촛대', kind: 'model', model: bb('wall_sconce'), yaw: 150 },
      { label: '정원 울타리', kind: 'model', model: bb('garden_fence'), yaw: -40 },
    ] },
    { id: 'effects', title: 'RPG 이펙트', desc: '흑백 스프라이트에 원소 색을 곱해 서버가 디스플레이 엔티티로 띄우는 방식을 재현했습니다. 0.25×로 보면 프레임이 보입니다.', panes: [
      { label: '이펙트 데모', kind: 'fx', timeline: fxTimeline, frames, yaw: -50, pitch: 22, desc: '바닥 마법진(보라, 반복) · 베기(얼음) · 타격 스파크 · 충격파(불) · 루트 빔(독)' },
      { label: '프레임 원본', kind: 'textures', textures: [...slash.map((c, i) => ({ name: `slash ${i}`, src: c.toDataURL(), w: 96 })), ...circle.slice(0, 2).map((c, i) => ({ name: `circle ${i}`, src: c.toDataURL(), w: 128 })), ...beamF.slice(0, 2).map((c, i) => ({ name: `beam ${i}`, src: c.toDataURL(), w: 48 }))] },
    ] },
    { id: 'textures', title: '블록·아이템 텍스처', desc: '16×16, 블록은 모두 이음새 없이 타일링', panes: [
      { label: '블록 텍스처', kind: 'textures', textures: tex(O, ['slate_stone', 'loam', 'meadow_top', 'meadow_side', 'ash_planks', 'ash_log', 'ash_log_top', 'rubble', 'willow_leaves', 'verdite_ore', 'clay_bricks', 'tin_plate'], 96) },
      { label: '아이템', kind: 'textures', textures: tex(O, ['ember_dagger', 'verdite_gem', 'storm_flask'], 128) },
    ] },
  ],
};
const sub = '지금까지 Atelier로 만든 마인크래프트 테스트 결과물. 엔티티·블록은 .bbmodel 원본을, 이펙트는 리소스팩과 같은 프레임 텍스처를 씁니다.';
buildViewer(data, 'out/viewer/existing.html', { title: 'Atelier 테스트 미리보기', subtitle: sub });
buildViewer(data, 'out/viewer/existing.local.html', { inlineThree: true, title: 'Atelier 테스트 미리보기', subtitle: sub });
console.log('ok', (fs.statSync('out/viewer/existing.html').size / 1024).toFixed(0) + 'KB');
