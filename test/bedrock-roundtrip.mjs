// 검증: 내보낸 bedrock .geo.json을 Blockbench의 가져오기 규칙(js/formats/bedrock/bedrock.js parseCube/parseBone)
// 그대로 되돌렸을 때 원래 큐브/본과 정확히 같은지 확인한다.
import assert from 'assert';
import path from 'path';
import { pathToFileURL } from 'url';
import { compileModel, FACES } from '../atelier/mc/model.js';
import { toBedrockGeometry, toBedrockAnimation } from '../atelier/mc/export.js';

function importLikeBlockbench(geo) {
  const cubes = [], bones = [];
  for (const b of geo['minecraft:geometry'][0].bones) {
    bones.push({ name: b.name, pivot: [-b.pivot[0], b.pivot[1], b.pivot[2]], rotation: b.rotation ? [-b.rotation[0], -b.rotation[1], b.rotation[2]] : [0, 0, 0] });
    for (const s of b.cubes ?? []) {
      const from = [-(s.origin[0] + s.size[0]), s.origin[1], s.origin[2]];
      const to = from.map((v, i) => v + s.size[i]);
      const rotation = s.rotation ? [-s.rotation[0], -s.rotation[1], s.rotation[2]] : [0, 0, 0];
      const origin = s.pivot ? [-s.pivot[0], s.pivot[1], s.pivot[2]] : null;
      const faces = {};
      for (const f of FACES) {
        const u = s.uv[f];
        if (!u) { faces[f] = null; continue; }
        let uv = [u.uv[0], u.uv[1], u.uv[0] + u.uv_size[0], u.uv[1] + u.uv_size[1]];
        if (f === 'up' || f === 'down') uv = [uv[2], uv[3], uv[0], uv[1]];
        faces[f] = uv;
      }
      cubes.push({ bone: b.name, from, to, rotation, origin, faces });
    }
  }
  return { cubes, bones };
}

const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
let checked = 0;
for (const file of process.argv.slice(2)) {
  const spec = (await import(pathToFileURL(path.resolve(file)).href)).default;
  const m = compileModel(typeof spec === 'function' ? spec() : spec);
  if (m.type !== 'entity') continue;
  const back = importLikeBlockbench(toBedrockGeometry(m));
  for (const b of m.bones) {
    const r = back.bones.find(x => x.name === b.name);
    assert(near(r.pivot, b.pivot), `bone ${b.name} pivot`);
    assert(near(r.rotation, b.rotation ?? [0, 0, 0]), `bone ${b.name} rotation`);
  }
  const seen = {};
  m.cubes.forEach(c => {
    // 같은 본 안에서는 내보낸 순서가 유지되므로 순서로 짝을 맞춘다(교차 평면처럼 위치가 같은 큐브 대비)
    const k = (seen[c.bone] = (seen[c.bone] ?? -1) + 1);
    const r = back.cubes.filter(x => x.bone === c.bone)[k];
    assert(r && near(r.from, c.from) && near(r.to, c.to), `${c.name} from/to 불일치`);
    assert(near(r.rotation, c.rot.angles), `${c.name} rotation`);
    if (c.rot.angles.some(Boolean)) assert(near(r.origin, c.rot.origin), `${c.name} pivot`);
    for (const f of FACES) {
      const a = c.faceRects[f]?.uv ?? null, b = r.faces[f];
      assert((a === null) === (b === null) && (!a || near(a, b)), `${c.name}.${f} uv ${a} vs ${b}`);
    }
    checked++;
  });
  // 애니메이션: 시간 오름차순, 회전 x·y / 위치 x 반전
  const anim = toBedrockAnimation(m);
  for (const [an, a] of Object.entries(m.animations)) {
    const out = anim.animations[`animation.${m.spec.name}.${an}`];
    for (const [bn, chans] of Object.entries(a.bones))
      for (const [ch, keys] of Object.entries(chans)) {
        const times = Object.keys(out.bones[bn][ch]).map(Number);
        assert.deepStrictEqual(times, [...times].sort((x, y) => x - y), `${bn}.${ch} 시간 정렬`);
        for (const [t, v] of Object.entries(keys)) {
          const got = Object.entries(out.bones[bn][ch]).find(([k]) => Math.abs(+k - +t) < 1e-9)[1];
          const exp = ch === 'rotation' ? [-v[0], -v[1], v[2]] : ch === 'position' ? [-v[0], v[1], v[2]] : v;
          assert(near(got, exp), `${bn}.${ch}@${t}`);
        }
      }
  }
  console.log(`✓ ${m.spec.name}: 큐브 ${m.cubes.length}개 · 본 ${m.bones.length}개 왕복 일치`);
}
if (!checked) { console.error('검증할 엔티티 없음'); process.exit(1); }
