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
export function buildPack(outDir, { name = 'atelier_pack', description = 'Made with Atelier', ns = 'atelier', packFormat = 46, blocks = [], items = [] }) {
  const files = [];
  const add = (p, data) => files.push([p, data]);
  const json = o => JSON.stringify(o, null, 2);
  add('pack.mcmeta', json({ pack: { pack_format: packFormat, description } }));
  for (const b of blocks) {
    const model = JSON.parse(JSON.stringify(b.model));
    model.textures = model.parent ? { all: `${ns}:block/${b.name}` } : { 0: `${ns}:block/${b.name}`, particle: `${ns}:block/${b.name}` };
    add(`assets/${ns}/blockstates/${b.name}.json`, json({ variants: { '': { model: `${ns}:block/${b.name}` } } }));
    add(`assets/${ns}/models/block/${b.name}.json`, json(model));
    add(`assets/${ns}/textures/block/${b.name}.png`, b.texture.toPNG());
    // 블록 아이템: 1.21.4+ items 정의 + 구버전용 models/item
    add(`assets/${ns}/items/${b.name}.json`, json({ model: { type: 'minecraft:model', model: `${ns}:block/${b.name}` } }));
    add(`assets/${ns}/models/item/${b.name}.json`, json({ parent: `${ns}:block/${b.name}` }));
  }
  for (const it of items) {
    add(`assets/${ns}/textures/item/${it.name}.png`, it.texture.toPNG());
    add(`assets/${ns}/models/item/${it.name}.json`, json({ parent: 'minecraft:item/generated', textures: { layer0: `${ns}:item/${it.name}` } }));
    add(`assets/${ns}/items/${it.name}.json`, json({ model: { type: 'minecraft:model', model: `${ns}:item/${it.name}` } }));
  }
  const root = path.join(outDir, name);
  for (const [p, d] of files) {
    fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
    fs.writeFileSync(path.join(root, p), d);
  }
  const zipPath = path.join(outDir, name + '.zip');
  fs.writeFileSync(zipPath, zip(files));
  return { root, zipPath, count: files.length };
}
