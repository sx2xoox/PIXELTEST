// Bedrock geometry(.geo.json) → 뷰어/Blockbench용 .bbmodel(5.0) 변환 — 공식 몹 모델을 공부하려고 만든 가져오기 도구
// 좌표 변환은 Blockbench의 Bedrock 가져오기와 같다: x축 반전
//   from.x = -(origin.x + size.x), pivot.x = -pivot.x, rotation = [-rx, -ry, rz]
import fs from 'fs';
import { randomUUID } from 'crypto';

/** 파일 하나에서 identifier로 geometry를 찾는다(신·구 형식 모두) */
export function findGeometry(json, id) {
  if (json['minecraft:geometry']) return json['minecraft:geometry'].find(g => g.description?.identifier === id || g.description?.identifier?.startsWith(id + ':'));
  for (const [k, v] of Object.entries(json)) if (k === id || k.startsWith(id + ':')) return { description: { identifier: k, texture_width: v.texturewidth, texture_height: v.textureheight }, bones: v.bones };
  return null;
}

export function geoToBB(geo, textureDataURL, { name } = {}) {
  const tw = geo.description.texture_width ?? 64, th = geo.description.texture_height ?? 64;
  const elements = [], groups = [], byName = new Map(), roots = [];
  const stats = { bones: 0, cubes: 0, rotatedCubes: 0, inflated: 0, mirrored: 0, perFaceUV: 0 };
  for (const b of geo.bones ?? []) {
    stats.bones++;
    const g = { uuid: randomUUID(), name: b.name, origin: b.pivot ? [-b.pivot[0], b.pivot[1], b.pivot[2]] : [0, 0, 0], rotation: b.rotation ? [-b.rotation[0], -b.rotation[1], b.rotation[2]] : [0, 0, 0] };
    groups.push(g);
    const node = { uuid: g.uuid, children: [] };
    byName.set(b.name, { node, b });
    for (const c of b.cubes ?? []) {
      stats.cubes++;
      const o = c.origin ?? [0, 0, 0], s = c.size ?? [0, 0, 0];
      const from = [-(o[0] + s[0]), o[1], o[2]], to = [from[0] + s[0], from[1] + s[1], from[2] + s[2]];
      const e = { uuid: randomUUID(), name: `${b.name}_cube`, type: 'cube', from, to, inflate: c.inflate ?? 0, origin: c.pivot ? [-c.pivot[0], c.pivot[1], c.pivot[2]] : g.origin, rotation: c.rotation ? [-c.rotation[0], -c.rotation[1], c.rotation[2]] : [0, 0, 0] };
      if (c.rotation) stats.rotatedCubes++;
      if (c.inflate) stats.inflated++;
      const mirror = c.mirror ?? b.mirror ?? false;
      if (mirror) stats.mirrored++;
      if (Array.isArray(c.uv) || c.uv === undefined) { e.box_uv = true; e.uv_offset = c.uv ?? [0, 0]; e.mirror_uv = mirror; }
      else {
        stats.perFaceUV++;
        e.box_uv = false; e.faces = {};
        for (const f of ['north', 'east', 'south', 'west', 'up', 'down']) {
          const fu = c.uv[f];
          if (!fu) { e.faces[f] = { uv: [0, 0, 0, 0], texture: null }; continue; }
          const [u, v] = fu.uv, [w, h] = fu.uv_size ?? [0, 0];
          e.faces[f] = { uv: f === 'up' || f === 'down' ? [u + w, v + h, u, v] : [u, v, u + w, v + h], texture: 0 };   // Bedrock 위/아래 면은 뒤집혀 있음
        }
      }
      elements.push(e);
      node.children.push(e.uuid);
    }
  }
  for (const [, { node, b }] of byName) {
    const p = b.parent && byName.get(b.parent);
    if (p) p.node.children.push(node); else roots.push(node);
  }
  return {
    bb: {
      meta: { format_version: '5.0', model_format: 'free', box_uv: true }, name: name ?? geo.description.identifier,
      resolution: { width: tw, height: th }, elements, groups, outliner: roots,
      textures: textureDataURL ? [{ uuid: randomUUID(), name: 'texture', source: textureDataURL, uv_width: tw, uv_height: th }] : [],
      animations: [],
    },
    stats,
  };
}

export function loadGeoFile(path, id) { return findGeometry(JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\s*\/\/.*$/gm, '')), id); }
