// 플레이어 스킨(64×64, classic/slim) · 갑옷(64×32 humanoid / humanoid_leggings) 템플릿.
// 부위·면 이름으로 칠하고, 플레이어 모델에 입혀 3D로 확인한다.
// 좌표: Blockbench 엔티티 공간(발 y=0, 북쪽(-z)이 정면, 몹의 오른쪽이 +x).
import { PixelCanvas } from '../pixel.js';
import { boxUV, FACES } from './model.js';
import { material } from './materials.js';
import { mix } from '../color.js';

// [이름, from, to, 기본 UV, 오버레이 UV, 피벗, 본]
function bodyParts(slim) {
  const aw = slim ? 3 : 4;
  return [
    { part: 'head', from: [-4, 24, -4], to: [4, 32, 4], uv: [0, 0], overlay: [32, 0], pivot: [0, 24, 0], inflate: 0.5 },
    { part: 'body', from: [-4, 12, -2], to: [4, 24, 2], uv: [16, 16], overlay: [16, 32], pivot: [0, 24, 0], inflate: 0.25 },
    { part: 'arm_r', from: [4, 12, -2], to: [4 + aw, 24, 2], uv: [40, 16], overlay: [40, 32], pivot: [5, 22, 0], inflate: 0.25 },
    { part: 'arm_l', from: [-4 - aw, 12, -2], to: [-4, 24, 2], uv: [32, 48], overlay: [48, 48], pivot: [-5, 22, 0], inflate: 0.25 },
    { part: 'leg_r', from: [0, 0, -2], to: [4, 12, 2], uv: [0, 16], overlay: [0, 32], pivot: [2, 12, 0], inflate: 0.25 },
    { part: 'leg_l', from: [-4, 0, -2], to: [0, 12, 2], uv: [16, 48], overlay: [0, 48], pivot: [-2, 12, 0], inflate: 0.25 },
  ];
}
// 바닐라 갑옷: 왼쪽 팔다리는 오른쪽 UV를 거울로 재사용
const ARMOR = {
  humanoid: [
    { part: 'head', uv: [0, 0], inflate: 1 },
    { part: 'body', uv: [16, 16], inflate: 1 },
    { part: 'arm_r', uv: [40, 16], inflate: 1 },
    { part: 'arm_l', uv: [40, 16], inflate: 1, mirror: true },
    { part: 'leg_r', uv: [0, 16], inflate: 1 },
    { part: 'leg_l', uv: [0, 16], inflate: 1, mirror: true },
  ],
  humanoid_leggings: [
    { part: 'body', uv: [16, 16], inflate: 0.5 },
    { part: 'leg_r', uv: [0, 16], inflate: 0.5 },
    { part: 'leg_l', uv: [0, 16], inflate: 0.5, mirror: true },
  ],
};

const sizeOf = p => p.to.map((v, i) => v - p.from[i]);
const rectOf = uv => ({ x: Math.min(uv[0], uv[2]), y: Math.min(uv[1], uv[3]), w: Math.abs(uv[2] - uv[0]), h: Math.abs(uv[3] - uv[1]) });

/**
 * 스킨 템플릿. region('head','north') → {x,y,w,h}. layer: 'base' | 'overlay'
 * 면 방향: north=정면, south=뒤, east=몹의 오른쪽 옆, west=왼쪽 옆, up=정수리, down=바닥
 */
export class Skin {
  constructor({ slim = false } = {}) {
    this.slim = slim;
    this.canvas = new PixelCanvas(64, 64);
    this.parts = bodyParts(slim);
  }
  region(part, face, layer = 'base') {
    const p = this.parts.find(x => x.part === part);
    if (!p) throw new Error(`부위 없음: ${part}`);
    return rectOf(boxUV(layer === 'base' ? p.uv : p.overlay, sizeOf(p))[face]);
  }
  /** 부위 전체(6면)를 재질로 칠한다. faces로 일부 면만 */
  fillPart(part, mat, opt = {}, { layer = 'base', faces = FACES } = {}) {
    for (const f of faces) {
      const r = this.region(part, f, layer);
      this.canvas.paste(material(mat, r.w, r.h, { ...opt, face: f, seed: (opt.seed ?? 1) + f.length * 7 }), r.x, r.y);
    }
    return this;
  }
  /** 면 안의 상대 좌표로 문자 지도 그리기 */
  chars(part, face, x, y, rows, legend, layer = 'base') {
    const r = this.region(part, face, layer);
    this.canvas.chars(r.x + x, r.y + y, rows, legend);
    return this;
  }
  /** 면 안에서 직접 그리기: fn(canvas, rect) */
  draw(part, face, fn, layer = 'base') { fn(this.canvas, this.region(part, face, layer)); return this; }
  /**
   * 입체 음영(스킨 품질의 핵심): 옆면 4개에 위→아래 그라디언트(위 밝게, 아래 어둡게),
   * 몸통 옆면(팔에 가려지는 곳)과 팔다리 안쪽 면은 AO로 더 어둡게. 투명 픽셀은 건드리지 않는다.
   */
  shade(part, { light = 0.18, dark = 0.22, ao = 0.18, layer = 'base' } = {}) {
    const inner = { body: ['east', 'west'], arm_r: ['west'], arm_l: ['east'], leg_r: ['west'], leg_l: ['east'] }[part] ?? [];
    for (const f of ['north', 'east', 'south', 'west']) {
      const r = this.region(part, f, layer);
      for (let y = 0; y < r.h; y++)
        for (let x = 0; x < r.w; x++) {
          const col = this.canvas.get(r.x + x, r.y + y);
          if (!col) continue;
          const t = r.h > 1 ? y / (r.h - 1) : 0.5;
          let out = t < 0.25 ? mix(col, '#fff4dc', light * (1 - t / 0.25)) : t > 0.6 ? mix(col, '#1a1424', dark * ((t - 0.6) / 0.4)) : col;
          if (inner.includes(f)) out = mix(out, '#1a1424', ao);
          this.canvas.set(r.x + x, r.y + y, out);
        }
    }
    return this;
  }
  /** 세로 주름(천): 면 안의 x 위치에 y0~y1 어두운 선 + 왼쪽 밝은 선 */
  fold(part, face, x, y0, y1, layer = 'base') {
    const r = this.region(part, face, layer);
    for (let y = y0; y <= y1; y++) {
      const a = this.canvas.get(r.x + x, r.y + y), b = this.canvas.get(r.x + x - 1, r.y + y);
      if (a) this.canvas.set(r.x + x, r.y + y, mix(a, '#1a1424', 0.25));
      if (b && x > 0) this.canvas.set(r.x + x - 1, r.y + y, mix(b, '#fff4dc', 0.12));
    }
    return this;
  }
  /** 옆면 4개를 감싸는 띠(벨트, 소매 끝, 부츠 윗단). y는 면 위에서부터, 높이 h */
  band(part, y, h, color, layer = 'base') {
    for (const f of ['north', 'east', 'south', 'west']) { const r = this.region(part, f, layer); this.canvas.rect(r.x, r.y + y, r.w, h, color); }
    return this;
  }
}

export class Armor {
  constructor(layer = 'humanoid') {
    this.layer = layer;
    this.canvas = new PixelCanvas(64, 32);
    this.parts = ARMOR[layer];
    this.base = bodyParts(false);
  }
  region(part, face) {
    const a = this.parts.find(x => x.part === part && !x.mirror) ?? this.parts.find(x => x.part === part);
    const p = this.base.find(x => x.part === part);
    return rectOf(boxUV(a.uv, sizeOf(p))[face]);
  }
  fillPart(part, mat, opt = {}, { faces = FACES } = {}) {
    for (const f of faces) {
      const r = this.region(part, f);
      this.canvas.paste(material(mat, r.w, r.h, { ...opt, face: f, seed: (opt.seed ?? 1) + f.length * 7 }), r.x, r.y);
    }
    return this;
  }
  chars(part, face, x, y, rows, legend) { const r = this.region(part, face); this.canvas.chars(r.x + x, r.y + y, rows, legend); return this; }
  draw(part, face, fn) { fn(this.canvas, this.region(part, face)); return this; }
  band(part, y, h, color) { for (const f of ['north', 'east', 'south', 'west']) { const r = this.region(part, f); this.canvas.rect(r.x, r.y + y, r.w, h, color); } return this; }
  /**
   * 바닐라 갑옷 마스크로 오려내기(docs/research/minecraft-armor.md). 얼굴을 덮으면 '대두'가 되므로 투구 정면 눈 아래는 항상 비운다.
   * helmet: 'light'(철·금·다이아 30/64) | 'heavy'(네더라이트 42/64, 볼 보호대) | 'open'(가죽 26/64, 코 보호대 없음) | 'domino'(눈 줄까지 눈가리개, 코 보호대 없음)
   * chest: V자 목선 + 아래 사다리꼴, arms: 팔 위 몇 줄, boots: 다리 아래 몇 줄
   */
  cut({ helmet = 'light', chest = true, armRows = 6, bootRows = 6 } = {}) {
    const M = {
      light: ['########', '########', '########', '#..##..#', '...##...', '........', '........', '........'],
      heavy: ['########', '########', '########', '#..##..#', '#..##..#', '#......#', '##....##', '##....##'],
      open: ['########', '########', '########', '#......#', '........', '........', '........', '........'],
      domino: ['########', '########', '########', '#..##..#', '#......#', '........', '........', '........'],
    };
    const SIDE = { light: ['########', '########', '########', '########', '####....', '........', '........', '........'], heavy: ['########', '########', '########', '########', '####..##', '.......#', '.......#', '.......#'] };
    const BACK = ['########', '########', '########', '########', '########', '########', '..####..', '........'];
    const apply = (part, face, mask, flip = false) => { const r = this.region(part, face); mask.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '.') this.canvas.set(r.x + (flip ? r.w - 1 - x : x), r.y + y, null); })); };
    if (this.layer === 'humanoid') {
      if (helmet) {
        apply('head', 'north', M[helmet]);
        const side = SIDE[helmet === 'heavy' ? 'heavy' : 'light'];
        apply('head', 'east', side); apply('head', 'west', side, true);   // 옆면: 뒤쪽(목덜미 방향)이 덮인 쪽이 되도록 좌우 반전
        apply('head', 'south', BACK); apply('head', 'down', Array(8).fill('........'));
      }
      if (chest) {
        apply('body', 'north', ['##....##', '###..###', ...Array(7).fill('########'), '.######.', '..####..', '........']);
        apply('body', 'south', ['##....##', ...Array(8).fill('########'), '.######.', '........', '........']);
      }
      if (armRows != null) this.keepRows('arm_r', 0, armRows);
      if (bootRows != null) this.keepRows('leg_r', 12 - bootRows, 12);
    }
    return this;
  }
  /** 영역의 일부만 남기기(예: 부츠는 다리 아래 4줄만) */
  keepRows(part, y0, y1) {
    for (const f of ['north', 'east', 'south', 'west']) {
      const r = this.region(part, f);
      for (let y = r.y; y < r.y + r.h; y++) if (y - r.y < y0 || y - r.y >= y1) for (let x = r.x; x < r.x + r.w; x++) this.canvas.set(x, y, null);
    }
    return this;
  }
}

/** 갑옷 검사(바닐라 기준): 얼굴 노출, 색 수 7~10, 주 재질 명도, 결 25~35% */
export function critiqueArmor(armor) {
  const issues = [], c = armor.canvas;
  if (armor.layer === 'humanoid') {
    const r = armor.region('head', 'north');
    let face = 0, cover = 0;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const on = !!c.get(r.x + x, r.y + y); cover += on; if (y >= 5 && x >= 2 && x <= 5 && on) face++; }
    if (face) issues.push({ severity: 'error', code: 'bighead', msg: `투구가 입·얼굴 가운데를 ${face}px 덮음 → 대두`, fix: "Armor.cut({helmet:'light'|'heavy'|'domino'})로 눈 아래를 비우세요." });
    if (cover > 42) issues.push({ severity: 'warn', code: 'helmet-cover', msg: `투구 정면 덮개 ${cover}/64(바닐라 26~42)`, fix: '이마 3줄 + 눈 줄 테두리만 칠하세요.' });
  }
  const cols = c.colors();
  if (cols.size > 12) issues.push({ severity: 'warn', code: 'armor-colors', msg: `색 ${cols.size}개(바닐라 7~10)`, fix: '주 재질 램프 5~7단계 + 강조색 1~2개로 줄이세요.' });
  return issues;
}

/** 스킨 검사: 기본 층은 불투명해야 한다(투명 픽셀은 게임에서 검게/불투명하게 보임) */
export function critiqueSkin(skin) {
  const issues = [];
  for (const p of skin.parts)
    for (const f of FACES) {
      const r = skin.region(p.part, f);
      let holes = 0;
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (!skin.canvas.get(x, y)) holes++;
      if (holes) issues.push({ severity: 'error', code: 'base-alpha', msg: `${p.part}.${f} 기본 층에 투명 픽셀 ${holes}개`, fix: '기본 층은 빈틈없이 칠하고, 투명은 오버레이 층에서만 쓰세요.' });
    }
  return issues;
}

/**
 * 미리보기용 플레이어 엔티티 스펙: 스킨(64×64) + 갑옷 두 장을 64×128 한 장으로 합쳐 박스 UV로 입힌다.
 * (실제 게임 파일은 각각 따로 저장한다. 합친 텍스처는 미리보기 전용)
 */
export function playerSpec(skin, { name = 'player', armor = {}, walk = true, overlay = true } = {}) {
  const tex = new PixelCanvas(64, 128);
  tex.paste(skin.canvas, 0, 0);
  if (armor.humanoid) tex.paste(armor.humanoid.canvas, 0, 64);
  if (armor.humanoid_leggings) tex.paste(armor.humanoid_leggings.canvas, 0, 96);
  const parts = bodyParts(skin.slim);
  const bones = [
    { name: 'root', pivot: [0, 0, 0] },
    { name: 'body', pivot: [0, 24, 0], parent: 'root' },
    { name: 'head', pivot: [0, 24, 0], parent: 'body' },
    { name: 'arm_r', pivot: [5, 22, 0], parent: 'body' },
    { name: 'arm_l', pivot: [-5, 22, 0], parent: 'body' },
    { name: 'leg_r', pivot: [2, 12, 0], parent: 'root' },
    { name: 'leg_l', pivot: [-2, 12, 0], parent: 'root' },
  ];
  const cubes = [];
  for (const p of parts) {
    cubes.push({ name: p.part, bone: p.part, from: p.from, to: p.to, boxUv: p.uv });
    if (overlay) cubes.push({ name: p.part + '_overlay', bone: p.part, from: p.from, to: p.to, boxUv: p.overlay, inflate: p.inflate });
  }
  for (const [layer, dy] of [['humanoid', 64], ['humanoid_leggings', 96]]) {
    if (!armor[layer]) continue;
    for (const a of ARMOR[layer]) {
      const p = parts.find(x => x.part === a.part);
      cubes.push({ name: `${layer}_${a.part}`, bone: a.part, from: p.from, to: p.to, boxUv: [a.uv[0], a.uv[1] + dy], inflate: a.inflate, mirror: a.mirror });
    }
  }
  return {
    name, type: 'entity', texture: tex, bones, cubes,
    animations: walk ? {
      walk: { length: 1, loop: true, bones: {
        leg_r: { rotation: { 0: [30, 0, 0], 0.5: [-30, 0, 0], 1: [30, 0, 0] } },
        leg_l: { rotation: { 0: [-30, 0, 0], 0.5: [30, 0, 0], 1: [-30, 0, 0] } },
        arm_r: { rotation: { 0: [-25, 0, 0], 0.5: [25, 0, 0], 1: [-25, 0, 0] } },
        arm_l: { rotation: { 0: [25, 0, 0], 0.5: [-25, 0, 0], 1: [25, 0, 0] } },
      } },
    } : {},
  };
}
