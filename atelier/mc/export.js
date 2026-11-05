// 내보내기: Blockbench .bbmodel / Java 블록 모델 JSON / 아이템 모델 JSON
import crypto from 'crypto';
import { FACES } from './model.js';

const uuid = seed => {
  const h = crypto.createHash('md5').update(String(seed)).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const num = v => +(+v).toFixed(4);

export function toBBModel(m) {
  const name = m.spec.name ?? 'model';
  const ns = m.spec.namespace ?? 'atelier';
  const isBlock = m.type === 'block';
  const elements = m.cubes.map((c, i) => {
    const faces = {};
    for (const f of FACES) {
      const r = c.faceRects[f];
      faces[f] = r ? { uv: r.uv, texture: 0 } : { uv: [0, 0, 0, 0], texture: null };
    }
    const el = {
      name: c.name,
      box_uv: false,
      rescale: false,
      locked: false,
      light_emission: c.light ?? 0,
      render_order: 'default',
      allow_mirror_modeling: true,
      from: c.from.map(num),
      to: c.to.map(num),
      autouv: 0,
      color: i % 8,
      origin: c.rot.origin.map(num),
      faces,
      type: 'cube',
      uuid: uuid(`${name}/el/${c.name}/${i}`),
    };
    if (c.rot.angles.some(Boolean)) el.rotation = c.rot.angles.map(num);
    if (c.inflate) el.inflate = c.inflate;
    return el;
  });
  const elUuid = new Map(m.cubes.map((c, i) => [c, elements[i].uuid]));

  // 아웃라이너(뼈대 계층). Blockbench 5.0 방식: 그룹 정의는 groups 배열, outliner는 uuid 참조 트리
  const boneUuid = b => uuid(`${name}/bone/${b}`);
  const groups = m.bones.map(b => ({
    name: b.name,
    origin: b.pivot.map(num),
    rotation: (b.rotation ?? [0, 0, 0]).map(num),
    color: 0,
    uuid: boneUuid(b.name),
    export: true,
    mirror_uv: false,
    isOpen: true,
    locked: false,
    visibility: true,
    autouv: 0,
  }));
  const build = parent =>
    m.bones
      .filter(b => (b.parent ?? null) === parent)
      .map(b => ({ uuid: boneUuid(b.name), isOpen: true, children: [...m.cubes.filter(c => c.bone === b.name).map(c => elUuid.get(c)), ...build(b.name)] }));
  const outliner = [...build(null), ...m.cubes.filter(c => !c.bone).map(c => elUuid.get(c))];

  const texture = {
    path: '',
    name: `${name}.png`,
    folder: isBlock ? 'block' : 'entity',
    namespace: ns,
    id: '0',
    width: m.atlasW,
    height: m.atlasH,
    uv_width: m.atlasW,
    uv_height: m.atlasH,
    particle: false,
    layers_enabled: false,
    sync_to_project: '',
    render_mode: 'default',
    render_sides: 'auto',
    frame_time: 1,
    frame_order_type: 'loop',
    frame_order: '',
    frame_interpolate: false,
    visible: true,
    internal: true,
    saved: false,
    uuid: uuid(`${name}/tex`),
    relative_path: '',
    source: m.atlas.toDataURL(),
  };

  const animations = Object.entries(m.animations).map(([an, a]) => ({
    uuid: uuid(`${name}/anim/${an}`),
    name: `animation.${name}.${an}`,
    loop: a.loop === false ? 'once' : a.loop === 'hold' ? 'hold' : 'loop',
    override: false,
    length: a.length ?? 1,
    snapping: 24,
    selected: false,
    anim_time_update: '',
    blend_weight: '',
    start_delay: '',
    loop_delay: '',
    animators: Object.fromEntries(
      Object.entries(a.bones).map(([bn, chans]) => [
        boneUuid(bn),
        {
          name: bn,
          type: 'bone',
          keyframes: Object.entries(chans).flatMap(([ch, keys]) =>
            Object.entries(keys).map(([t, v]) => ({
              channel: ch,
              data_points: [{ x: String(v[0]), y: String(v[1]), z: String(v[2]) }],
              uuid: uuid(`${name}/${an}/${bn}/${ch}/${t}`),
              time: +t,
              color: -1,
              interpolation: a.interpolation ?? 'catmullrom',   // Mojang 공식 애니메이션 기본값(97%)
            }))
          ),
        },
      ])
    ),
  }));

  return {
    meta: { format_version: '5.0', model_format: isBlock ? 'java_block' : 'bedrock', box_uv: false },
    name,
    model_identifier: isBlock ? '' : name,
    visible_box: [2, 2, 0.5],
    variable_placeholders: '',
    variable_placeholder_buttons: [],
    timeline_setups: [],
    unhandled_root_fields: {},
    resolution: { width: m.atlasW, height: m.atlasH },
    elements,
    groups,
    outliner,
    textures: [texture],
    animations,
  };
}

const BLOCK_DISPLAY = {
  gui: { rotation: [30, 225, 0], translation: [0, 0, 0], scale: [0.625, 0.625, 0.625] },
  ground: { rotation: [0, 0, 0], translation: [0, 3, 0], scale: [0.25, 0.25, 0.25] },
  fixed: { rotation: [0, 0, 0], translation: [0, 0, 0], scale: [0.5, 0.5, 0.5] },
  thirdperson_righthand: { rotation: [75, 45, 0], translation: [0, 2.5, 0], scale: [0.375, 0.375, 0.375] },
  firstperson_righthand: { rotation: [0, 45, 0], translation: [0, 0, 0], scale: [0.4, 0.4, 0.4] },
  firstperson_lefthand: { rotation: [0, 225, 0], translation: [0, 0, 0], scale: [0.4, 0.4, 0.4] },
};

/** Java Edition 블록 모델 JSON(assets/<ns>/models/block/<name>.json). UV는 0~16 공간으로 환산 */
export function toJavaBlockModel(m) {
  const name = m.spec.name ?? 'model';
  const ns = m.spec.namespace ?? 'atelier';
  const k = 16 / m.atlasSize;
  return {
    credit: 'Made with Atelier',
    texture_size: [m.atlasSize, m.atlasSize],
    textures: { 0: `${ns}:block/${name}`, particle: `${ns}:block/${name}` },
    elements: m.cubes.map(c => {
      const el = { name: c.name, from: c.from.map(num), to: c.to.map(num) };
      const ai = c.rot.angles.findIndex(Boolean);
      if (ai >= 0) el.rotation = { angle: c.rot.angles[ai], axis: 'xyz'[ai], origin: c.rot.origin.map(num) };
      el.faces = {};
      for (const f of FACES) {
        const r = c.faceRects[f];
        if (r) el.faces[f] = { uv: r.uv.map(v => num(v * k)), texture: '#0', ...(c.faces?.[f]?.cull ? { cullface: c.faces[f].cull } : {}) };
      }
      if (c.shade === false) el.shade = false;
      if (c.light) el.light_emission = c.light;
      return el;
    }),
    display: m.spec.display ?? BLOCK_DISPLAY,
  };
}

export const itemModel = (name, ns = 'atelier', parent = 'minecraft:item/generated') => ({
  parent,
  textures: { layer0: `${ns}:item/${name}` },
});

// ---------------------------------------------------------------------------
// Bedrock: geometry(.geo.json 1.12.0) / animation(.animation.json 1.8.0)
// 좌표 변환은 Blockbench bedrock 코덱과 동일하게 맞췄다(js/formats/bedrock/bedrock.js 확인):
//   큐브 origin.x = -(from.x + size.x), pivot.x 부호 반전, rotation x·y 부호 반전,
//   면 UV는 [u,v]+[w,h]이고 up/down은 원점을 반대 모서리로 옮기고 크기를 음수로
//   본(bone) pivot.x 반전, rotation x·y 반전 / 애니메이션 rotation x·y, position x 반전
// ---------------------------------------------------------------------------
const neg = v => (v === 0 ? 0 : -v);

export function toBedrockGeometry(m) {
  const name = m.spec.name ?? 'model';
  const bones = m.bones.map(b => {
    const bone = { name: b.name };
    if (b.parent) bone.parent = b.parent;
    bone.pivot = [neg(b.pivot[0]), b.pivot[1], b.pivot[2]].map(num);
    if (b.rotation && b.rotation.some(Boolean)) bone.rotation = [neg(b.rotation[0]), neg(b.rotation[1]), b.rotation[2]].map(num);
    const cubes = m.cubes.filter(c => c.bone === b.name).map(c => {
      const cube = { origin: [neg(c.from[0] + c.size[0]), c.from[1], c.from[2]].map(num), size: c.size.map(num) };
      if (c.inflate) cube.inflate = c.inflate;
      if (c.rot.angles.some(Boolean)) {
        cube.pivot = [neg(c.rot.origin[0]), c.rot.origin[1], c.rot.origin[2]].map(num);
        cube.rotation = [neg(c.rot.angles[0]), neg(c.rot.angles[1]), c.rot.angles[2]].map(num);
      }
      cube.uv = {};
      for (const f of FACES) {
        const r = c.faceRects[f];
        if (!r) continue;
        let uv = [r.uv[0], r.uv[1]], size = [r.uv[2] - r.uv[0], r.uv[3] - r.uv[1]];
        if (f === 'up' || f === 'down') { uv = [uv[0] + size[0], uv[1] + size[1]]; size = [-size[0], -size[1]]; }
        cube.uv[f] = { uv: uv.map(num), uv_size: size.map(num) };
      }
      return cube;
    });
    if (cubes.length) bone.cubes = cubes;
    return bone;
  });
  // 보이는 범위: 모델 높이/너비를 블록 단위로
  const ys = m.cubes.flatMap(c => [c.from[1], c.to[1]]), xs = m.cubes.flatMap(c => [c.from[0], c.to[0], c.from[2], c.to[2]]);
  const vbw = Math.ceil(Math.max(...xs.map(Math.abs)) * 2 / 16 + 1), vbh = Math.ceil(Math.max(...ys) / 16 + 1);
  return {
    format_version: '1.12.0',
    'minecraft:geometry': [{
      description: { identifier: `geometry.${name}`, texture_width: m.atlasW, texture_height: m.atlasH, visible_bounds_width: vbw, visible_bounds_height: vbh, visible_bounds_offset: [0, vbh / 2 - 0.5, 0] },
      bones,
    }],
  };
}

export function toBedrockAnimation(m) {
  const name = m.spec.name ?? 'model';
  const animations = {};
  for (const [an, a] of Object.entries(m.animations)) {
    const bones = {};
    for (const [bn, chans] of Object.entries(a.bones)) {
      bones[bn] = {};
      for (const [ch, keys] of Object.entries(chans)) {
        const conv = v => (ch === 'rotation' ? [neg(v[0]), neg(v[1]), v[2]] : ch === 'position' ? [neg(v[0]), v[1], v[2]] : v);
        bones[bn][ch] = Object.fromEntries(Object.entries(keys).sort((a, b) => +a[0] - +b[0]).map(([t, v]) => [(+t).toFixed(4).replace(/0+$/, '').replace(/\.$/, '.0'), (a.interpolation ?? 'catmullrom') === 'catmullrom' ? { post: conv(v).map(num), lerp_mode: 'catmullrom' } : conv(v).map(num)]));   // 공식 형식: 키마다 lerp_mode
      }
    }
    animations[`animation.${name}.${an}`] = { loop: a.loop !== false, animation_length: a.length ?? 1, bones };
  }
  return { format_version: '1.8.0', animations };
}

// ---------------------------------------------------------------------------
// Java 블록스테이트 + 부품 모델
// spec.blockstate: { variants: { 'facing=north': { model:'<part>', y:0 }, ... } }
//               또는 { multipart: [{ apply:{ model:'<part>' } }, { when:{ north:'true' }, apply:{ model:'side', y:0, uvlock:true } }] }
// model 값은 부품 이름(parts의 키) → ns:block/<name>_<part> 로 바뀐다
// ---------------------------------------------------------------------------
export function toJavaPartModels(m) {
  if (!m.spec.parts) return { [m.spec.name]: toJavaBlockModel(m) };
  const out = {};
  for (const part of Object.keys(m.spec.parts)) {
    const sub = { ...m, cubes: m.cubes.filter(c => c.part === part) };
    out[`${m.spec.name}_${part}`] = toJavaBlockModel(sub);
  }
  return out;
}

export function toBlockstate(m) {
  const name = m.spec.name, ns = m.spec.namespace ?? 'atelier';
  const ref = part => `${ns}:block/${m.spec.parts ? `${name}_${part}` : name}`;
  const fix = a => (Array.isArray(a) ? a.map(fix) : { ...a, model: ref(a.model) });
  const bs = m.spec.blockstate;
  if (!bs) return { variants: { '': { model: ref(Object.keys(m.spec.parts ?? { x: 1 })[0]) } } };
  if (bs.variants) return { variants: Object.fromEntries(Object.entries(bs.variants).map(([k, v]) => [k, fix(v)])) };
  return { multipart: bs.multipart.map(p => ({ ...(p.when ? { when: p.when } : {}), apply: fix(p.apply) })) };
}

// ---------------------------------------------------------------------------
// ModelEngine(R4) 호환: Generic(free) 형식 + 규칙 린트
// 규칙 출처: ModelEngine 위키(Creating-a-Model, Bone-Behaviors, Animating-a-Model) — docs/research/mc-rpg-effects.md 2.3
// ---------------------------------------------------------------------------
export function toModelEngine(m) {
  const bb = toBBModel(m);
  bb.meta.model_format = 'free';
  bb.model_identifier = '';
  return bb;
}

export function lintModelEngine(m) {
  const issues = [];
  const add = (severity, msg, fix = '') => issues.push({ severity, code: 'me', msg, fix });
  for (const c of m.cubes) {
    const nz = c.rot.angles.filter(Boolean);
    if (nz.length > 1) add('error', `ME: ${c.name} 큐브가 두 축 이상 회전`, '큐브 회전은 한 축만. 여러 축은 본(bone) 회전으로 처리하세요.');
    if (nz.some(a => ![22.5, 45].includes(Math.abs(a)))) add('error', `ME: ${c.name} 큐브 회전 ${nz}° (0/±22.5/±45만)`, '큐브를 본으로 감싸고 본을 회전시키세요.');
  }
  const hb = m.bones.find(b => b.name === 'hitbox');
  if (m.type === 'entity') {
    if (!hb) add('warn', 'ME: hitbox 본 없음 → 기본 히트박스 사용', '큐브 1개짜리 hitbox 본(X=Z)을 두세요. 피벗 Y = 눈높이.');
    else {
      const hc = m.cubes.filter(c => c.bone === 'hitbox');
      if (hc.length !== 1) add('error', `ME: hitbox 본 큐브 ${hc.length}개(1개여야 함)`);
      else if (Math.abs(hc[0].size[0] - hc[0].size[2]) > 1e-6) add('info', 'ME: hitbox는 X=Z로 읽힘(넓은 쪽 기준)', '');
      for (const a of Object.values(m.animations)) if (a.bones.hitbox) add('error', 'ME: hitbox 본은 애니메이션 불가(로드 시 제거)');
    }
    for (const [n, a] of Object.entries(m.animations)) if (a.interpolation && !['linear', 'catmullrom', 'step'].includes(a.interpolation)) add('warn', `ME: ${n} 보간 ${a.interpolation} → linear로 처리됨`);
  }
  return issues;
}

/**
 * 3D 손무기 → Java 아이템 모델. 요소를 -16~32 범위로 옮기고, 바닐라 handheld 표시값(26.3 jar의 models/item/handheld.json)을
 * 기준으로 크기만 맞춘다. grip: 모델 좌표의 쥐는 점(기본 원점).
 */
export function toJavaItemModel(m, { grip = [0, 0, 0], scale = 1 } = {}) {
  const ns = m.spec.namespace ?? 'atelier', name = m.spec.name;
  const off = [8 - grip[0], 8 - grip[1], 8 - grip[2]]; // 쥐는 점을 블록 중심(8,8,8)으로
  const k = 16 / m.atlasW, kv = 16 / m.atlasH;
  const issues = [];
  const elements = m.cubes.map(c => {
    const from = c.from.map((v, i) => num(v + off[i])), to = c.to.map((v, i) => num(v + off[i]));
    if ([...from, ...to].some(v => v < -16 || v > 32)) issues.push({ severity: 'error', msg: `${c.name}: 아이템 모델 범위(-16~32) 밖`, fix: '모델을 줄이고 display scale을 키우세요.' });
    const el = { name: c.name, from, to, faces: {} };
    const ai = c.rot.angles.findIndex(Boolean);
    if (ai >= 0) el.rotation = { angle: c.rot.angles[ai], axis: 'xyz'[ai], origin: c.rot.origin.map((v, i) => num(v + off[i])) };
    for (const f of FACES) { const r = c.faceRects[f]; if (r) el.faces[f] = { uv: [r.uv[0] * k, r.uv[1] * kv, r.uv[2] * k, r.uv[3] * kv].map(num), texture: '#0' }; }
    if (c.light) el.light_emission = c.light;
    return el;
  });
  const s = v => v.map(x => num(x * scale));
  const display = {
    thirdperson_righthand: { rotation: [0, -90, 55], translation: [0, 4, 0.5], scale: s([0.85, 0.85, 0.85]) },
    thirdperson_lefthand: { rotation: [0, 90, -55], translation: [0, 4, 0.5], scale: s([0.85, 0.85, 0.85]) },
    firstperson_righthand: { rotation: [0, -90, 25], translation: [1.13, 3.2, 1.13], scale: s([0.68, 0.68, 0.68]) },
    firstperson_lefthand: { rotation: [0, 90, -25], translation: [1.13, 3.2, 1.13], scale: s([0.68, 0.68, 0.68]) },
    gui: { rotation: [0, 0, -45], translation: [0, 0, 0], scale: s([0.5, 0.5, 0.5]) },
    ground: { rotation: [0, 0, 0], translation: [0, 2, 0], scale: s([0.4, 0.4, 0.4]) },
    fixed: { rotation: [0, 90, 0], scale: s([0.6, 0.6, 0.6]) },
  };
  return { model: { credit: 'Made with Atelier', texture_size: [m.atlasW, m.atlasH], textures: { 0: `${ns}:item/${name}`, particle: `${ns}:item/${name}` }, elements, display }, issues };
}
