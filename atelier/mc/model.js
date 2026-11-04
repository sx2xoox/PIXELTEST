// 마인크래프트 큐브 모델 DSL → 컴파일(면별 텍스처 칠하기 + 아틀라스 패킹 + 검증)
//
// 모델 스펙 예:
// {
//   name: 'lantern_post', type: 'block' | 'entity',
//   density: 1,                       // 1 = 바닐라(1유닛 = 1텍셀). 모델 전체에서 하나만 쓴다.
//   materials: { wood: { mat: 'planks', base: '#a7834f' } },
//   bones: [{ name: 'body', pivot: [0, 12, 0], parent: 'root', rotation: [0,0,0] }],   // entity
//   cubes: [{ name, bone, from:[x,y,z], to:[x,y,z] | origin+size, material: 'wood' | {mat,...},
//             faces: { north: { material?, chars?: { x, y, rows, legend } , hidden?: true } },
//             rotation: { axis:'y', angle:22.5, origin:[8,8,8] } | [x,y,z] (+ pivot), inflate }],
//   animations: { walk: { length: 1, loop: true, bones: { leg_l: { rotation: { 0:[30,0,0], 0.5:[-30,0,0], 1:[30,0,0] } } } } }
// }
import { PixelCanvas } from '../pixel.js';
import { material } from './materials.js';

export const FACES = ['north', 'east', 'south', 'west', 'up', 'down'];

const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * 마인크래프트 박스 UV(Blockbench와 동일 규칙). [u,v] 오프셋과 크기 (w,h,d)
 *   동 [u, v+d] · 북 [u+d, v+d] · 서 [u+d+w, v+d] · 남 [u+2d+w, v+d] (각 d|w × h)
 *   위 [u+d+w, v+d] → [u+d, v] (양축 반전) · 아래 [u+d+2w, v] → [u+d+w, v+d] (가로 반전)
 * mirror면 가로 뒤집기 + 동/서 교환(바닐라 왼팔·왼다리 갑옷)
 */
export function boxUV([u, v], [w, h, d], mirror = false) {
  const r = {
    east: [u, v + d, u + d, v + d + h],
    west: [u + d + w, v + d, u + 2 * d + w, v + d + h],
    up: [u + d + w, v + d, u + d, v],
    down: [u + d + 2 * w, v, u + d + w, v + d],
    south: [u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h],
    north: [u + d, v + d, u + d + w, v + d + h],
  };
  if (mirror) {
    for (const f of FACES) r[f] = [r[f][2], r[f][1], r[f][0], r[f][3]];
    [r.east, r.west] = [r.west, r.east];
  }
  return r;
}

export function faceDims(size, face) {
  const [sx, sy, sz] = size;
  if (face === 'north' || face === 'south') return [sx, sy];
  if (face === 'east' || face === 'west') return [sz, sy];
  return [sx, sz];
}

function normRotation(c) {
  // 내부 표현: { origin:[x,y,z], angles:[x,y,z] }
  if (!c.rotation) return { origin: c.pivot ?? center(c), angles: [0, 0, 0] };
  if (Array.isArray(c.rotation)) return { origin: c.pivot ?? center(c), angles: c.rotation };
  const ax = { x: 0, y: 1, z: 2 }[c.rotation.axis];
  const angles = [0, 0, 0];
  angles[ax] = c.rotation.angle;
  return { origin: c.rotation.origin ?? center(c), angles };
}
const center = c => c.from.map((v, i) => (v + c.to[i]) / 2);

/** 셸프 패킹: 높이순 정렬 후 줄 단위로 채운다. 2의 거듭제곱. square=false면 가로 2:1까지 허용 */
function pack(rects, square = true) {
  const area = rects.reduce((a, r) => a + r.w * r.h, 0);
  // 스카이라인(bottom-left) 패킹: 각 x열의 현재 높이를 기록하고 가장 낮게 들어가는 자리에 놓는다
  const tryFit = (W, H) => {
    const sorted = [...rects].sort((a, b) => b.h - a.h || b.w - a.w);
    const sky = new Array(W).fill(0);
    for (const r of sorted) {
      if (r.w > W) return false;
      let bestX = -1, bestY = Infinity;
      for (let x = 0; x + r.w <= W; x++) {
        let y = 0;
        for (let k = x; k < x + r.w; k++) y = Math.max(y, sky[k]);
        if (y < bestY) { bestY = y; bestX = x; }
      }
      if (bestY + r.h > H) return false;
      r.x = bestX; r.y = bestY;
      for (let k = bestX; k < bestX + r.w; k++) sky[k] = bestY + r.h;
    }
    return true;
  };
  for (let W = 16; ; W *= 2) {
    if (!square && W * (W / 2) >= area && tryFit(W, W / 2)) return [W, W / 2];
    if (W * W >= area && tryFit(W, W)) return [W, W];
  }
}

export function compileModel(spec) {
  const type = spec.type ?? 'block';
  const density = spec.density ?? 1;
  const issues = [];
  const add = (severity, code, msg, fix) => issues.push({ severity, code, msg, fix });
  const mats = spec.materials ?? {};
  const resolveMat = m => (typeof m === 'string' ? (mats[m] ? { ...mats[m] } : { mat: m }) : { ...m });

  // parts: { 이름: [큐브...] } → 블록스테이트용 부품. 모든 부품이 아틀라스 하나를 공유한다
  const srcCubes = spec.parts ? Object.entries(spec.parts).flatMap(([part, list]) => list.map(c => ({ ...c, part }))) : spec.cubes;
  const cubes = srcCubes.map((c0, idx) => {
    const c = { ...c0 };
    if (!c.from) { c.from = c.origin; c.to = c.origin.map((v, i) => v + c.size[i]); }
    c.name ??= `cube${idx}`;
    c.size = c.to.map((v, i) => v - c.from[i]);
    c.rot = normRotation(c);
    return c;
  });

  let atlas, atlasW, atlasH;
  if (spec.texture) {
    // ---------- 고정 텍스처 + 박스 UV(스킨·갑옷처럼 정해진 배치) ----------
    atlas = spec.texture; atlasW = atlas.w; atlasH = atlas.h;
    for (const c of cubes) {
      c.faceRects = {};
      if (!c.boxUv) throw new Error(`${c.name}: texture 모드에서는 boxUv:[u,v]가 필요`);
      const uv = boxUV(c.boxUv, c.size, c.mirror);
      for (const f of FACES) c.faceRects[f] = c.faces?.[f]?.hidden ? null : { uv: uv[f] };
    }
  } else {
  // ---------- 면 칠하기 ----------
  const rects = [];
  for (const c of cubes) {
    c.faceRects = {};
    for (const f of FACES) {
      const fs = c.faces?.[f] ?? {};
      const [fw, fh] = faceDims(c.size, f);
      if (fs.hidden || fw === 0 || fh === 0) { c.faceRects[f] = null; continue; }
      const pw = Math.max(1, Math.round(fw * density)), ph = Math.max(1, Math.round(fh * density));
      if (Math.abs(fw * density - pw) > 1e-6 || Math.abs(fh * density - ph) > 1e-6)
        add('warn', 'mixel', `${c.name}.${f} 면 크기 ${fw}×${fh}가 정수 텍셀이 아님 → 텍셀이 늘어나 보임(믹셀)`, '큐브 크기를 1/density 단위로 맞추세요.');
      const m = resolveMat(fs.material ?? c.material ?? 'solid');
      const canvas = m.paint ? m.paint(pw, ph, f) : material(m.mat ?? 'solid', pw, ph, { ...m, face: f, seed: (m.seed ?? 0) + hash(c.name + (m.sameSeed ? '' : f)) % 997 });
      if (fs.chars) canvas.chars(fs.chars.x ?? 0, fs.chars.y ?? 0, fs.chars.rows, fs.chars.legend);
      if (fs.draw) fs.draw(canvas);
      // 같은 텍스처를 공유해서 아틀라스 절약: shareKey가 같으면 같은 영역 사용
      const r = { w: pw, h: ph, canvas, cube: c, face: f, key: fs.share };
      c.faceRects[f] = r;
      if (fs.share && rects.find(o => o.key === fs.share)) { r.sharedWith = rects.find(o => o.key === fs.share); continue; }
      rects.push(r);
    }
  }
  [atlasW, atlasH] = pack(rects, type === 'block');
  atlas = new PixelCanvas(atlasW, atlasH);
  for (const r of rects) atlas.paste(r.canvas, r.x, r.y);
  for (const c of cubes)
    for (const f of FACES) {
      const r = c.faceRects[f];
      if (!r) continue;
      const src = r.sharedWith ?? r;
      c.faceRects[f].uv = [src.x, src.y, src.x + r.w, src.y + r.h];
    }
  const used = rects.reduce((s, r) => s + r.w * r.h, 0) / (atlasW * atlasH);
  if (used < 0.35 && atlasW > 16) add('info', 'atlas-waste', `아틀라스 사용률 ${(used * 100).toFixed(0)}%`, '같은 면은 faces.<dir>.share로 공유하세요.');
  }
  const atlasSize = atlasW;

  // ---------- 검증 ----------
  if (type === 'block') {
    for (const c of cubes) {
      const nz = c.rot.angles.filter(a => a !== 0);
      if (nz.length > 1) add('error', 'rot-axes', `${c.name}: Java 블록 모델은 한 축만 회전 가능`, '회전을 한 축으로 줄이거나 entity(bedrock) 형식을 쓰세요.');
      // 1.21.x 이전 호환 기준: -45 ~ 45, 22.5 단위
      if (nz.some(a => Math.abs(a) > 45 || Math.abs(a / 22.5 - Math.round(a / 22.5)) > 1e-6))
        add('error', 'rot-angle', `${c.name}: 회전각 ${nz}° → Java 블록 모델은 -45/-22.5/0/22.5/45만 허용`, '22.5° 단위로 맞추세요.');
      if ([...c.from, ...c.to].some(v => v < -16 || v > 32))
        add('error', 'bounds', `${c.name}: 좌표가 -16~32 범위를 벗어남`, '블록 모델은 3×3×3 블록 공간 안에 있어야 합니다.');
    }
  }
  // 같은 평면·같은 방향의 겹친 면 = z-fighting(깜빡임)
  for (let i = 0; i < cubes.length; i++)
    for (let j = i + 1; j < cubes.length; j++) {
      const a = cubes[i], b = cubes[j];
      if (a.rot.angles.some(Boolean) || b.rot.angles.some(Boolean) || a.inflate || b.inflate) continue;
      if ((a.bone ?? '') !== (b.bone ?? '')) continue;
      for (let ax = 0; ax < 3; ax++) {
        const o = [0, 1, 2].filter(k => k !== ax);
        const overlap = o.every(k => Math.min(a.to[k], b.to[k]) - Math.max(a.from[k], b.from[k]) > 0);
        if (!overlap) continue;
        const TO = ['east', 'up', 'south'][ax], FROM = ['west', 'down', 'north'][ax];
        const vis = (c, f) => !!c.faceRects[f];
        if ((a.to[ax] === b.to[ax] && vis(a, TO) && vis(b, TO)) || (a.from[ax] === b.from[ax] && vis(a, FROM) && vis(b, FROM)))
          add('warn', 'z-fight', `${a.name}와 ${b.name}의 면이 같은 평면에서 겹침(z-fighting)`, '한쪽을 0.01 이상 inflate하거나 1텍셀 들이세요.');
      }
    }
  if (cubes.length > (type === 'block' ? 40 : 80)) add('info', 'cube-count', `큐브 ${cubes.length}개 → 많음(성능/편집성)`, '보이지 않는 큐브를 합치세요.');
  // 뼈대 검증
  let bones = spec.bones ?? [];
  if (spec.parts && !spec.bones) {
    // 부품을 Blockbench 그룹(폴더)으로: 회전 없는 정리용
    bones = Object.keys(spec.parts).map(name => ({ name, pivot: [8, 8, 8] }));
    cubes.forEach(c => (c.bone = c.part));
  }
  if (type === 'entity') {
    if (!bones.length) add('error', 'no-bones', '엔티티에 bone이 없음', '최소 root/body/head bone을 두세요(애니메이션 피벗).');
    for (const c of cubes) if (!bones.find(b => b.name === c.bone)) add('error', 'bone-missing', `${c.name}의 bone "${c.bone}"이 정의되지 않음`, 'bones에 추가하세요.');
    for (const b of bones) if (b.parent && !bones.find(p => p.name === b.parent)) add('error', 'parent-missing', `${b.name}의 parent "${b.parent}" 없음`, '');
    // 대칭 검사: 이름의 _r/_l(또는 _right/_left)만 바꾼 정확한 짝끼리 피벗 x 부호 비교
    const swap = n => n.replace(/(^|_)(r|l|right|left)(?=_|$)/, (m, a, s) => a + ({ r: 'l', l: 'r', right: 'left', left: 'right' })[s]);
    for (const b of bones) {
      const twinName = swap(b.name);
      if (twinName === b.name || b.name > twinName) continue;
      const twin = bones.find(o => o.name === twinName);
      if (twin && Math.abs(b.pivot[0] + twin.pivot[0]) > 1e-6) add('warn', 'asym', `${b.name}/${twin.name} 피벗이 좌우 대칭이 아님`, 'x 좌표 부호만 반대로 맞추세요.');
    }
  }
  // 색 절제(바닐라 실측: 아이템 7~13색, 갑옷 64×32 9~10색, 워든 128² 18색 · 래비저 24색 · 위더 18색)
  if (!spec.texture) {
    const nColors = atlas.colors().size;
    const limit = spec.colorBudget ?? (type === 'block' ? 24 : 32);
    if (nColors > limit) add('warn', 'palette', `텍스처 색 ${nColors}개(예산 ${limit}) → 바닐라 대비 산만`, '재질 수를 줄이고 같은 램프를 공유하세요(바닐라 보스 18~24색).');
  }
  return { spec, type, cubes, bones, atlas, atlasSize, atlasW, atlasH, density, issues, animations: spec.animations ?? {} };
}
