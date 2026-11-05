// 3D 무기 → Java 아이템 모델(1.21.4+) — 손에 든 모습과 인벤토리 칸 아이콘을 같은 3D 모델로
//  · 본 회전 굽기: Java 요소는 본이 없다. 큐브의 본 사슬에서 회전이 하나(한 축, ±22.5/45°)면 요소 회전으로 옮긴다. 둘 이상이면 오류.
//  · 범위 맞춤: 요소 좌표는 −16~32(48칸)만 허용 → 모델이 크면 좌표를 축소하고 display scale을 그만큼 키운다(최대 4).
//  · GUI 자동 맞춤(docs/research/slot-fit.md): 후보 회전들 중 "자루가 왼쪽 아래 → 오른쪽 위 대각선 + 옆모습(날이 넓게 보임)"을 골라
//    투영 경계상자가 칸의 15/16을 채우도록 scale, 가운데로 translation.
//  · items 정의: 3D 아이콘(기본) 또는 바닐라 삼지창처럼 GUI·바닥·액자만 2D 스프라이트(select display_context)
const FACES = ['north', 'east', 'south', 'west', 'up', 'down'];
const num = v => Math.round(v * 1e4) / 1e4;
const rad = d => (d * Math.PI) / 180;
const rotAxis = (p, axis, deg, o) => {
  const a = rad(deg), c = Math.cos(a), s = Math.sin(a), [x, y, z] = [p[0] - o[0], p[1] - o[1], p[2] - o[2]];
  const r = axis === 'x' ? [x, y * c - z * s, y * s + z * c] : axis === 'y' ? [x * c + z * s, y, -x * s + z * c] : [x * c - y * s, x * s + y * c, z];
  return [r[0] + o[0], r[1] + o[1], r[2] + o[2]];
};
// Minecraft ItemTransform: rotationXYZ → M = Rx·Ry·Rz (벡터에는 Z, Y, X 순으로 적용)
const rotXYZ = (p, [rx, ry, rz]) => rotAxis(rotAxis(rotAxis(p, 'z', rz, [0, 0, 0]), 'y', ry, [0, 0, 0]), 'x', rx, [0, 0, 0]);

/** 요소의 꼭짓점 8개(요소 회전 반영) */
function corners(el) {
  const out = [];
  for (const x of [el.from[0], el.to[0]]) for (const y of [el.from[1], el.to[1]]) for (const z of [el.from[2], el.to[2]]) {
    out.push(el.rotation ? rotAxis([x, y, z], el.rotation.axis, el.rotation.angle, el.rotation.origin) : [x, y, z]);
  }
  return out;
}

/**
 * GUI 표시값 자동 계산. 자루 방향 = 모델 +Y(쥐는 점 → 머리). 반환 { rotation, translation, scale, score }
 * fill = 칸에서 차지할 비율(바닐라 도구 13~16px → 15/16)
 */
export function fitGui(elements, { fill = 15 / 16, grip = [8, 8, 8] } = {}) {
  const pts = elements.flatMap(corners).map(p => [p[0] - 8, p[1] - 8, p[2] - 8]);
  const g = [grip[0] - 8, grip[1] - 8, grip[2] - 8];
  const top = pts.reduce((a, p) => (p[1] > a[1] ? p : a), pts[0]);
  // 보이는 면적: 요소마다 6면의 (면 넓이 × 카메라 쪽 법선 성분) 합 — 넓은 면(날·촛대 팔)이 정면을 볼수록 크다.
  // (경계상자 비율은 45° 기운 가는 막대도 정사각형이라 속는다 → 면적으로 판정)
  // 보이는 넓이 = 칸(48×48, GUI 배율 3)에 실제로 찍히는 픽셀 수. 면 넓이 합은 돌출 스프라이트의 안쪽 면 때문에 속는다
  //  → 요소 안을 0.5칸 간격으로 표본 찍어 투영한다.
  const samples = elements.flatMap(el => {
    const out = [], d = el.to.map((v, i) => v - el.from[i]), n = d.map(v => Math.max(1, Math.ceil(Math.abs(v) / 0.5)));
    for (let i = 0; i <= n[0]; i++) for (let j = 0; j <= n[1]; j++) for (let k = 0; k <= n[2]; k++) {
      let p = [el.from[0] + (d[0] * i) / n[0], el.from[1] + (d[1] * j) / n[1], el.from[2] + (d[2] * k) / n[2]];
      if (el.rotation) p = rotAxis(p, el.rotation.axis, el.rotation.angle, el.rotation.origin);
      out.push([p[0] - 8, p[1] - 8, p[2] - 8]);
    }
    return out;
  });
  const cands = [];
  // v2(반성): 15° 격자 전수 탐색 + 점수식은 이상한 각도를 골랐다. 사람이 하는 대로 단순하게:
  //  1) 가장 얇은 축(두께)을 카메라 쪽으로 → 옆모습이 정면  2) 자루(모델 +Y)를 화면에서 왼쪽 아래 → 오른쪽 위 45°(바닐라 도구 방향)
  //  두께가 X면 [x, ±45, z] 조합 4개, Z면 화면 안에서 바로 굴리는 2개 중 자루가 45°로 서는 것만 남기고, 칸에 더 많이 찍히는 쪽.
  const ext = [0, 2].map(i => Math.max(...pts.map(p => p[i])) - Math.min(...pts.map(p => p[i])));
  const POSES = ext[0] <= ext[1] ? [[90, 45, -90], [-90, -45, -90], [90, -45, 90], [-90, 45, 90]] : [[0, 0, -45], [0, 0, 45], [0, 180, -45], [0, 180, 45]];
  for (const r of POSES) {
    const G = rotXYZ(g, r), Tp = rotXYZ(top, r);
    const ang = (Math.atan2(Tp[1] - G[1], Tp[0] - G[0]) * 180) / Math.PI;     // 자루 방향(화면): 45° = 오른쪽 위
    const P = pts.map(p => rotXYZ(p, r));
    const ys = P.map(p => p[1]), xs = P.map(p => p[0]);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys), k = (48 * fill) / Math.max(w, h);
    const cx0 = (Math.max(...xs) + Math.min(...xs)) / 2, cy0 = (Math.max(...ys) + Math.min(...ys)) / 2, hit = new Set();
    for (const p of samples) { const q = rotXYZ(p, r); hit.add(Math.floor((q[0] - cx0) * k + 24) * 64 + Math.floor((q[1] - cy0) * k + 24)); }
    cands.push({ r, ang, area: hit.size, xs, ys });
  }
  const amax = Math.max(...cands.map(c => c.area));
  let best = null;
  for (const c of cands) {
    const score = -Math.abs(c.ang - 45) / 15 + (c.area / amax) * 0.5;          // 방향이 먼저, 같은 방향이면 더 많이 보이는 쪽
    if (best && score <= best.score) continue;
    const w = Math.max(...c.xs) - Math.min(...c.xs), h = Math.max(...c.ys) - Math.min(...c.ys);
    const s = Math.min(4, (16 * fill) / Math.max(w, h));
    const cx = (Math.max(...c.xs) + Math.min(...c.xs)) / 2, cy = (Math.max(...c.ys) + Math.min(...c.ys)) / 2;
    best = { rotation: c.r, scale: [s, s, s].map(num), translation: [-cx * s, -cy * s, 0].map(num), score: num(score), ang: num(c.ang) };
  }
  return best;
}

/**
 * compileModel 결과(m) → { model, issues }. ns/name은 텍스처·모델 경로에 쓴다.
 * 손 표시값은 바닐라 handheld(26.3 jar) 기준에 좌표 축소분을 곱한다.
 */
export function toJavaItem(m, { ns = 'atelier', name = m.spec.name, grip = [0, 0, 0], handScale = 1, squash = null } = {}) {
  // squash = { below: y, k }: 칸 아이콘 전용 변형 — 머리(y ≥ below)는 그대로, 자루(y < below)만 k배로 줄인다.
  //  긴 무기는 칸(16px)에 통째로 넣으면 머리가 3~4px로 작아진다 → 자루를 줄여 머리를 키운다(텍스처는 늘어난 만큼 압축).
  const sq = v => (squash && v < squash.below ? squash.below - (squash.below - v) * squash.k : v);
  const issues = [];
  const bones = Object.fromEntries((m.bones ?? []).map(b => [b.name, b]));
  const chain = b => { const out = []; for (let n = b; n && bones[n]; n = bones[n].parent) out.push(bones[n]); return out; };
  // 1) 요소(원래 좌표) + 본 회전 굽기
  const raw = m.cubes.map(c => {
    const rots = chain(c.bone).filter(b => b.rotation && b.rotation.some(Boolean));
    const own = c.rot.angles.findIndex(Boolean);
    const el = { name: c.name, from: [c.from[0], sq(c.from[1]), c.from[2]], to: [c.to[0], sq(c.to[1]), c.to[2]], faces: {} };
    const k = 16 / m.atlasW, kv = 16 / m.atlasH;
    for (const f of FACES) { const r = c.faceRects[f]; if (r) el.faces[f] = { uv: [r.uv[0] * k, r.uv[1] * kv, r.uv[2] * k, r.uv[3] * kv].map(num), texture: '#0' }; }
    if (c.light) el.light_emission = c.light;
    const R = [...rots.map(b => ({ angles: b.rotation, origin: b.pivot })), ...(own >= 0 ? [{ angles: c.rot.angles, origin: c.rot.origin }] : [])];
    if (R.length > 1) issues.push({ severity: 'error', msg: `${c.name}: 회전이 ${R.length}겹(본 사슬) → Java 요소는 한 번만 회전 가능` });
    if (R.length) {
      const ai = R[0].angles.findIndex(Boolean), ang = R[0].angles[ai];
      if (R[0].angles.filter(Boolean).length > 1) issues.push({ severity: 'error', msg: `${c.name}: 두 축 회전` });
      if (![-45, -22.5, 0, 22.5, 45].includes(ang)) issues.push({ severity: 'warn', msg: `${c.name}: 회전 ${ang}° → Java는 22.5° 단위만(1.21.4)` });
      el.rotation = { angle: ang, axis: 'xyz'[ai], origin: [R[0].origin[0], sq(R[0].origin[1]), R[0].origin[2]] };
    }
    return el;
  });
  // 2) 범위 맞춤: 쥐는 점을 (8,8,8)로, 경계상자가 −16~32에 들어가도록 균일 축소
  if (squash) grip = [grip[0], sq(grip[1]), grip[2]];
  const all = raw.flatMap(corners);
  const lo = [0, 1, 2].map(i => Math.min(...all.map(p => p[i]))), hi = [0, 1, 2].map(i => Math.max(...all.map(p => p[i])));
  const ext = Math.max(...[0, 1, 2].map(i => Math.max(hi[i] - grip[i], grip[i] - lo[i])));
  const f = Math.min(1, 23.5 / ext);                                       // 쥐는 점에서 가장 먼 곳까지 24칸 안
  const tf = p => p.map((v, i) => num(8 + (v - grip[i]) * f));
  const elements = raw.map(el => ({ ...el, from: tf(el.from), to: tf(el.to), ...(el.rotation ? { rotation: { ...el.rotation, origin: tf(el.rotation.origin) } } : {}) }));
  // 3) 표시값
  const s = v => v.map(x => num(Math.min(4, x / f * handScale)));
  const gui = fitGui(elements, { grip: [8, 8, 8] });
  const display = {
    thirdperson_righthand: { rotation: [0, -90, 55], translation: [0, 4, 0.5], scale: s([0.85, 0.85, 0.85]) },
    thirdperson_lefthand: { rotation: [0, 90, -55], translation: [0, 4, 0.5], scale: s([0.85, 0.85, 0.85]) },
    firstperson_righthand: { rotation: [0, -90, 25], translation: [1.13, 3.2, 1.13], scale: s([0.68, 0.68, 0.68]) },
    firstperson_lefthand: { rotation: [0, 90, -25], translation: [1.13, 3.2, 1.13], scale: s([0.68, 0.68, 0.68]) },
    gui: { rotation: gui.rotation, translation: gui.translation, scale: gui.scale },
    ground: { rotation: [0, 0, 0], translation: [0, 2, 0], scale: s([0.4, 0.4, 0.4]) },
    fixed: { rotation: [0, 90, 0], scale: s([0.6, 0.6, 0.6]) },
  };
  if (f < 1) issues.push({ severity: 'info', msg: `좌표 ${num(f)}배 축소 → display scale ${num(1 / f)}배` });
  return {
    model: { credit: 'Made with Atelier', texture_size: [m.atlasW, m.atlasH], textures: { 0: `${ns}:item/${name}`, particle: `${ns}:item/${name}` }, gui_light: 'side', elements, display },
    gui, issues,
  };
}

/**
 * items/<name>.json — 칸(인벤토리)에 무엇을 보일지 고른다(1.21.4+ select display_context)
 *  mode '3d'     : 어디서나 같은 3D 모델(기본 — 칸에서는 옆모습을 45° 대각선으로)
 *  mode '3d-gui' : 칸에서는 자루를 줄인 칸 전용 3D 모델(<name>_gui), 손·바닥·액자는 원래 3D
 *  mode '2d'     : 칸·바닥·액자에서 2D 스프라이트(<name>_icon), 손에서는 3D — 바닐라 삼지창·망원경 방식
 */
export function itemDefinition(ns, name, { mode = '3d' } = {}) {
  const m = id => ({ type: 'minecraft:model', model: `${ns}:item/${id}` });
  if (mode === '3d') return { model: m(name) };
  const when = mode === '2d' ? ['gui', 'ground', 'fixed'] : ['gui'];
  return { model: { type: 'minecraft:select', property: 'minecraft:display_context', cases: [{ when, model: m(mode === '2d' ? `${name}_icon` : `${name}_gui`) }], fallback: m(name) } };
}
