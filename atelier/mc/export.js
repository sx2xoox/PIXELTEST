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
              interpolation: a.interpolation ?? 'linear',
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
