// Java Edition 리소스팩 패키징: assets/<ns>/{blockstates,models,items,textures} + pack.mcmeta → 폴더 + .zip
// 주의: 리소스팩은 "모습"만 바꾼다. 새 블록/아이템을 게임에 등록하려면 모드(Fabric/NeoForge)나 데이터팩이 필요하다.
//       바닐라 블록/아이템을 다시 입히려면 ns를 'minecraft'로, name을 바닐라 이름으로 쓰면 된다.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { crc32 } from '../png.js';

/** 의존성 없는 zip 작성기(deflate) */
export function zip(files, when = new Date()) {
  const dosTime = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
  const dosDate = ((when.getFullYear() - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
  const locals = [], centrals = [];
  let offset = 0;
  for (const [name, data0] of files) {
    const data = Buffer.isBuffer(data0) ? data0 : Buffer.from(data0);
    const comp = zlib.deflateRawSync(data, { level: 9 });
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, nameBuf, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, nameBuf);
    offset += 30 + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

/**
 * pack: { name, description, ns, packFormat, blocks:[{ name, model(Java JSON), texture(PixelCanvas) }], items:[{ name, texture }] }
 * packFormat 기본 46 = Java 1.21.4. 다른 버전이면 --pack-format으로 바꾼다.
 */
export function buildPack(outDir, { name = 'atelier_pack', description = 'Made with Atelier', ns = 'atelier', packFormat = 46, blocks = [], items = [], vfx = null }) {
  const files = [];
  const add = (p, data) => files.push([p, data]);
  const json = o => JSON.stringify(o, null, 2);
  add('pack.mcmeta', json({ pack: { pack_format: packFormat, description } }));
  for (const b of blocks) {
    const models = b.models ?? { [b.name]: b.model };
    for (const [mn, m0] of Object.entries(models)) {
      const model = JSON.parse(JSON.stringify(m0));
      model.textures = model.parent ? { all: `${ns}:block/${b.name}` } : { 0: `${ns}:block/${b.name}`, particle: `${ns}:block/${b.name}` };
      add(`assets/${ns}/models/block/${mn}.json`, json(model));
    }
    const bs = b.blockstate ? JSON.parse(JSON.stringify(b.blockstate).replaceAll('"atelier:', `"${ns}:`)) : { variants: { '': { model: `${ns}:block/${b.name}` } } };
    add(`assets/${ns}/blockstates/${b.name}.json`, json(bs));
    const itemModelName = Object.keys(models)[0];
    add(`assets/${ns}/textures/block/${b.name}.png`, b.texture.toPNG());
    // 블록 아이템: 1.21.4+ items 정의 + 구버전용 models/item
    add(`assets/${ns}/items/${b.name}.json`, json({ model: { type: 'minecraft:model', model: `${ns}:block/${itemModelName}` } }));
    add(`assets/${ns}/models/item/${b.name}.json`, json({ parent: `${ns}:block/${itemModelName}` }));
  }
  for (const it of items) {
    add(`assets/${ns}/textures/item/${it.name}.png`, it.texture.toPNG());
    add(`assets/${ns}/models/item/${it.name}.json`, json({ parent: 'minecraft:item/generated', textures: { layer0: `${ns}:item/${it.name}` } }));
    add(`assets/${ns}/items/${it.name}.json`, json({ model: { type: 'minecraft:model', model: `${ns}:item/${it.name}` } }));
  }
  if (vfx) for (const f of vfxFiles(ns, vfx)) files.push(f);
  const root = path.join(outDir, name);
  for (const [p, d] of files) {
    fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
    fs.writeFileSync(path.join(root, p), d);
  }
  const zipPath = path.join(outDir, name + '.zip');
  fs.writeFileSync(zipPath, zip(files));
  return { root, zipPath, count: files.length };
}

// ---------------------------------------------------------------------------
// Bedrock 애드온(.mcaddon) = 리소스팩(RP) + 행동팩(BP). 엔티티를 게임에서 바로 소환할 수 있게 한다.
//   RP: manifest.json, entity/<n>.entity.json, models/entity/<n>.geo.json, animations/<n>.animation.json,
//       textures/entity/<n>.png, texts/en_US.lang
//   BP: manifest.json(RP 의존), entities/<n>.json(체력·이동·배회 AI)
// ---------------------------------------------------------------------------
import crypto from 'crypto';
const uuidOf = seed => {
  const h = crypto.createHash('md5').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

export function buildBedrockAddon(outDir, { name = 'atelier_addon', ns = 'atelier', entities = [], minEngine = [1, 21, 0] }) {
  const json = o => JSON.stringify(o, null, 2);
  const rpUuid = uuidOf(`${name}/rp`), bpUuid = uuidOf(`${name}/bp`);
  const files = [];
  const add = (p, d) => files.push([p, d]);
  const manifest = (kind, uuid, deps) => ({
    format_version: 2,
    header: { name: `${name} ${kind}`, description: 'Made with Atelier', uuid, version: [1, 0, 0], min_engine_version: minEngine },
    modules: [{ type: kind === 'RP' ? 'resources' : 'data', uuid: uuidOf(`${uuid}/module`), version: [1, 0, 0] }],
    ...(deps ? { dependencies: deps } : {}),
  });
  add(`${name}_RP/manifest.json`, json(manifest('RP', rpUuid)));
  add(`${name}_BP/manifest.json`, json(manifest('BP', bpUuid, [{ uuid: rpUuid, version: [1, 0, 0] }])));
  const lang = [];
  for (const e of entities) {
    const id = `${ns}:${e.name}`;
    const anims = Object.keys(e.animation?.animations ?? {});
    const short = a => a.split('.').pop();
    add(`${name}_RP/entity/${e.name}.entity.json`, json({
      format_version: '1.10.0',
      'minecraft:client_entity': {
        description: {
          identifier: id,
          materials: { default: 'entity_alphatest' },
          textures: { default: `textures/entity/${e.name}` },
          geometry: { default: `geometry.${e.name}` },
          ...(anims.length ? { animations: Object.fromEntries(anims.map(a => [short(a), a])) } : {}),
          // 걷기 애니메이션은 이동 속도로 가중치를 준다(가만히 있으면 0)
          ...(anims.length ? { scripts: { animate: anims.map(a => (short(a) === 'walk' ? { walk: 'query.modified_move_speed' } : short(a))) } } : {}),
          render_controllers: ['controller.render.default'],
          spawn_egg: { base_color: e.eggColors?.[0] ?? '#7a818c', overlay_color: e.eggColors?.[1] ?? '#5d8f3a' },
        },
      },
    }));
    add(`${name}_RP/models/entity/${e.name}.geo.json`, json(e.geometry));
    if (anims.length) add(`${name}_RP/animations/${e.name}.animation.json`, json(e.animation));
    add(`${name}_RP/textures/entity/${e.name}.png`, e.texture.toPNG());
    lang.push(`entity.${id}.name=${e.displayName ?? e.name}`, `item.spawn_egg.entity.${id}.name=Spawn ${e.displayName ?? e.name}`);
    const h = e.hitbox ?? { width: 0.6, height: 1.2 };
    add(`${name}_BP/entities/${e.name}.json`, json({
      format_version: '1.20.0',
      'minecraft:entity': {
        description: { identifier: id, is_spawnable: true, is_summonable: true, is_experimental: false },
        components: {
          'minecraft:type_family': { family: [e.name, 'mob'] },
          'minecraft:health': { value: e.health ?? 10, max: e.health ?? 10 },
          'minecraft:collision_box': h,
          'minecraft:movement': { value: e.speed ?? 0.2 },
          'minecraft:navigation.walk': { can_walk: true, avoid_water: true },
          'minecraft:movement.basic': {},
          'minecraft:jump.static': {},
          'minecraft:physics': {},
          'minecraft:pushable': { is_pushable: true, is_pushable_by_piston: true },
          'minecraft:behavior.float': { priority: 0 },
          'minecraft:behavior.random_stroll': { priority: 6, speed_multiplier: 1 },
          'minecraft:behavior.look_at_player': { priority: 7, look_distance: 6, probability: 0.02 },
          'minecraft:behavior.random_look_around': { priority: 8 },
        },
      },
    }));
  }
  add(`${name}_RP/texts/en_US.lang`, lang.join('\n') + '\n');
  add(`${name}_RP/texts/languages.json`, json(['en_US']));
  for (const [p, d] of files) {
    fs.mkdirSync(path.dirname(path.join(outDir, name, p)), { recursive: true });
    fs.writeFileSync(path.join(outDir, name, p), d);
  }
  const addonPath = path.join(outDir, name + '.mcaddon');
  fs.writeFileSync(addonPath, zip(files));
  return { root: path.join(outDir, name), addonPath, count: files.length };
}

// ---------------------------------------------------------------------------
// VFX 리소스: 파티클 재텍스처 / 프레임 선택형 VFX 아이템(range_dispatch + tint) / 반복 애니메이션 텍스처(.mcmeta)
// 아이템 모델 정의(items/*.json) 형식은 1.21.4+ (custom_model_data range 속성·tint 소스는 jar에서 확인)
// ---------------------------------------------------------------------------
const planeModel = (tex, { light = 15 } = {}) => ({
  textures: { 0: tex, particle: tex },
  elements: [{
    from: [0, 0, 8], to: [16, 16, 8], light_emission: light,
    faces: { north: { uv: [16, 0, 0, 16], texture: '#0', tintindex: 0 }, south: { uv: [0, 0, 16, 16], texture: '#0', tintindex: 0 } }, // 양면
  }],
  display: { fixed: { rotation: [0, 0, 0], translation: [0, 0, 0], scale: [1, 1, 1] }, head: { rotation: [0, 0, 0], scale: [1, 1, 1] } },
});

export function vfxFiles(ns, { particles = [], vfxItems = [], loops = [] }) {
  const files = [];
  const add = (p, d) => files.push([p, d]);
  const json = o => JSON.stringify(o, null, 2);
  for (const p of particles) {
    // 바닐라 파티클 재정의: ns는 반드시 minecraft
    p.frames.forEach((f, i) => add(`assets/minecraft/textures/particle/${p.texture ?? p.id}_${i}.png`, f.toPNG()));
    add(`assets/minecraft/particles/${p.id}.json`, json({ textures: p.frames.map((_, i) => `minecraft:${p.texture ?? p.id}_${i}`) }));
  }
  for (const v of vfxItems) {
    const entries = v.frames.map((f, i) => {
      add(`assets/${ns}/textures/item/vfx/${v.name}_${i}.png`, f.toPNG());
      add(`assets/${ns}/models/item/vfx/${v.name}_${i}.json`, json(planeModel(`${ns}:item/vfx/${v.name}_${i}`, v)));
      return { threshold: i, model: { type: 'minecraft:model', model: `${ns}:item/vfx/${v.name}_${i}`, tints: [{ type: 'minecraft:custom_model_data', index: 0, default: 16777215 }] } };
    });
    add(`assets/${ns}/items/vfx_${v.name}.json`, json({ model: { type: 'minecraft:range_dispatch', property: 'minecraft:custom_model_data', index: 0, entries, fallback: entries[0].model } }));
  }
  for (const l of loops) {
    add(`assets/${ns}/textures/item/vfx/${l.name}.png`, l.strip.toPNG());
    // 프레임이 정사각형이 아니면 width/height를 명시해야 한다(기본은 '가로폭 = 프레임 높이'로 해석)
    const anim = { frametime: l.frametime ?? 2, interpolate: false };
    if (l.frameW !== l.frameH) Object.assign(anim, { width: l.frameW, height: l.frameH });
    add(`assets/${ns}/textures/item/vfx/${l.name}.png.mcmeta`, json({ animation: anim }));
    add(`assets/${ns}/models/item/vfx/${l.name}.json`, json(planeModel(`${ns}:item/vfx/${l.name}`, l)));
    add(`assets/${ns}/items/vfx_${l.name}.json`, json({ model: { type: 'minecraft:model', model: `${ns}:item/vfx/${l.name}`, tints: [{ type: 'minecraft:custom_model_data', index: 0, default: 16777215 }] } }));
  }
  return files;
}
