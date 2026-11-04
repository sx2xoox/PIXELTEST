// 큐브 모델 3D 미리보기(로컬 Chromium + three.js). 마인크래프트식 면 음영과 최근접 필터로 게임과 비슷하게 보이게 한다.
import path from 'path';
import { fileURLToPath } from 'url';
import { browser } from '../render.js';
import { FACES } from './model.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const THREE_PATH = path.join(ROOT, 'node_modules/three/build/three.min.js');

/** 컴파일된 모델 → 브라우저로 넘길 순수 데이터 */
function payload(m) {
  return {
    atlas: m.atlas.toDataURL(),
    W: m.atlasW,
    H: m.atlasH,
    type: m.type,
    bones: m.bones.map(b => ({ name: b.name, pivot: b.pivot, rotation: b.rotation ?? [0, 0, 0], parent: b.parent ?? null })),
    cubes: m.cubes.map(c => ({
      from: c.from, to: c.to, inflate: c.inflate ?? 0, light: c.light ?? 0, bone: c.bone ?? null, origin: c.rot.origin, angles: c.rot.angles,
      faces: Object.fromEntries(FACES.map(f => [f, c.faceRects[f] ? c.faceRects[f].uv : null])),
    })),
    animations: m.animations,
  };
}

function pageScript() {
  // 브라우저 안에서 실행
  window.renderModel = async (data, views, px) => {
    const T = window.THREE;
    const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = data.atlas; });
    const tex = new T.Texture(img);
    tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter; tex.generateMipmaps = false;
    tex.encoding = T.sRGBEncoding; tex.flipY = true; tex.needsUpdate = true;
    const SW = data.W, SH = data.H;
    const SHADE = { east: 0.6, west: 0.6, up: 1, down: 0.5, south: 0.8, north: 0.8 };
    const ORDER = ['east', 'west', 'up', 'down', 'south', 'north']; // BoxGeometry 그룹 순서
    const rad = d => (d * Math.PI) / 180;
    const evalAnim = (anim, t) => {
      const pose = {};
      if (!anim) return pose;
      for (const [bn, chans] of Object.entries(anim.bones)) {
        pose[bn] = {};
        for (const [ch, keys] of Object.entries(chans)) {
          const ks = Object.entries(keys).map(([k, v]) => [+k, v]).sort((a, b) => a[0] - b[0]);
          let v = ks[0][1];
          for (let i = 0; i < ks.length - 1; i++)
            if (t >= ks[i][0] && t <= ks[i + 1][0]) {
              const u = (t - ks[i][0]) / Math.max(1e-6, ks[i + 1][0] - ks[i][0]);
              v = ks[i][1].map((a, j) => a + (ks[i + 1][1][j] - a) * u);
            }
          if (t > ks[ks.length - 1][0]) v = ks[ks.length - 1][1];
          pose[bn][ch] = v;
        }
      }
      return pose;
    };
    const build = (pose, silhouette) => {
      const scene = new T.Scene();
      const mat = silhouette
        ? new T.MeshBasicMaterial({ color: 0xf2f2f2, side: T.DoubleSide })
        : new T.MeshBasicMaterial({ map: tex, vertexColors: true, alphaTest: 0.1, transparent: false, side: T.DoubleSide });
      const groups = { __root: scene };
      const pivots = { __root: [0, 0, 0] };
      const boneByName = Object.fromEntries(data.bones.map(b => [b.name, b]));
      const ensure = name => {
        if (!name) return scene;
        if (groups[name]) return groups[name];
        const b = boneByName[name];
        const parent = ensure(b.parent);
        const pp = b.parent ? boneByName[b.parent].pivot : [0, 0, 0];
        const g = new T.Group();
        const p = pose[name] || {};
        const pos = p.position || [0, 0, 0];
        g.position.set(b.pivot[0] - pp[0] + pos[0], b.pivot[1] - pp[1] + pos[1], b.pivot[2] - pp[2] + pos[2]);
        const r = b.rotation.map((v, i) => v + ((p.rotation || [0, 0, 0])[i] || 0));
        g.rotation.order = 'ZYX';
        g.rotation.set(rad(r[0]), rad(r[1]), rad(r[2]));
        parent.add(g);
        groups[name] = g;
        pivots[name] = b.pivot;
        return g;
      };
      for (const c of data.cubes) {
        const parent = ensure(c.bone);
        const bp = c.bone ? boneByName[c.bone].pivot : [0, 0, 0];
        const size = c.to.map((v, i) => Math.max(0.001, v - c.from[i] + c.inflate * 2));
        const geo = new T.BoxGeometry(...size);
        const uv = geo.attributes.uv;
        const colors = [];
        ORDER.forEach((f, gi) => {
          const r = c.faces[f];
          for (let k = 0; k < 4; k++) {
            const idx = gi * 4 + k;
            const uu = uv.getX(idx), vv = uv.getY(idx);
            if (r) uv.setXY(idx, (r[0] + uu * (r[2] - r[0])) / SW, 1 - (r[1] + (1 - vv) * (r[3] - r[1])) / SH);
            else uv.setXY(idx, 0, 0);
            const s = c.light ? 1 : SHADE[f]; // 발광 면은 음영 없음(게임과 동일)
            colors.push(s, s, s);
          }
        });
        geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
        // 면이 없는(null) 그룹은 그리지 않음
        geo.groups.forEach((g, gi) => (g.materialIndex = c.faces[ORDER[gi]] ? 0 : 1));
        const mesh = new T.Mesh(geo, [mat, new T.MeshBasicMaterial({ visible: false })]);
        const pivot = new T.Group();
        pivot.position.set(c.origin[0] - bp[0], c.origin[1] - bp[1], c.origin[2] - bp[2]);
        pivot.rotation.order = 'ZYX';
        pivot.rotation.set(rad(c.angles[0]), rad(c.angles[1]), rad(c.angles[2]));
        const ctr = c.from.map((v, i) => (v + c.to[i]) / 2);
        mesh.position.set(ctr[0] - c.origin[0], ctr[1] - c.origin[1], ctr[2] - c.origin[2]);
        pivot.add(mesh);
        parent.add(pivot);
      }
      return scene;
    };
    const canvas = document.createElement('canvas');
    const renderer = new T.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(1);
    renderer.setSize(px, px);
    const restBox = new T.Box3().setFromObject(build({}, false));
    const out = [];
    for (const v of views) {
      const anim = v.anim ? data.animations[v.anim] : null;
      const scene = build(evalAnim(anim, v.t || 0), v.silhouette);
      const box = restBox;
      const ctr = box.getCenter(new T.Vector3());
      const sz = box.getSize(new T.Vector3());
      const half = Math.max(sz.x, sz.y, sz.z) * (v.zoom || 0.62);
      const cam = new T.OrthographicCamera(-half, half, half, -half, 0.1, 1000);
      const d = new T.Vector3(...v.dir).normalize();
      cam.position.copy(ctr).addScaledVector(d, 200);
      cam.up.set(0, 1, 0);
      if (Math.abs(d.y) > 0.99) cam.up.set(0, 0, -1);
      cam.lookAt(ctr);
      renderer.setClearColor(0x000000, 0);
      renderer.render(scene, cam);
      out.push({ label: v.label, src: canvas.toDataURL('image/png') });
    }
    return out;
  };
}

export async function modelSheet(m, issues, { title = 'model' } = {}) {
  const b = await browser();
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ path: THREE_PATH });
  await page.addScriptTag({ content: `(${pageScript.toString()})()` });
  // 엔티티는 북쪽(-z)이 앞, 블록은 남쪽/동쪽이 보이는 인벤토리 시점
  const ent = m.type === 'entity';
  const F = ent ? -1 : 1;
  const views = [
    { label: '정면 3/4', dir: [F * -0.9, 0.75, F * 1] },
    { label: '뒤 3/4', dir: [F * 0.9, 0.6, F * -1] },
    { label: ent ? '정면(북)' : '남쪽', dir: [0, 0.0, F] },
    { label: '옆(동)', dir: [1, 0, 0] },
    { label: '위', dir: [0, 1, 0.0001] },
    { label: '실루엣 정면', dir: [0, 0, F], silhouette: true },
    { label: '실루엣 3/4', dir: [F * -0.9, 0.75, F * 1], silhouette: true },
  ];
  for (const an of Object.keys(m.animations)) {
    const L = m.animations[an].length ?? 1;
    for (let i = 0; i < 4; i++) views.push({ label: `${an} t=${((L * i) / 4).toFixed(2)}`, dir: [F * -0.9, 0.5, F * 1], anim: an, t: (L * i) / 4 });
  }
  const shots = await page.evaluate(async ([data, views]) => window.renderModel(data, views, 300), [payload(m), views]);
  const sev = { error: '#ff6b6b', warn: '#ffa94d', info: '#74c0fc' };
  const issuesHtml = issues.map(i => `<li><b style="color:${sev[i.severity]}">${i.severity}</b> ${i.msg}${i.fix ? `<br><i>→ ${i.fix}</i>` : ''}</li>`).join('') || '<li>규칙 위반 없음. 실루엣·비율·색 덩어리를 눈으로 판단하세요.</li>';
  const atlasScale = Math.max(1, Math.floor(512 / m.atlasW));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#202024;color:#ddd;font:13px Pretendard,sans-serif}.w{padding:16px;width:1240px}
    h1{font-size:20px;margin:0 0 10px}.g{display:flex;flex-wrap:wrap;gap:10px}
    figure{margin:0;background:repeating-conic-gradient(#3a3a40 0 25%,#323238 0 50%) 0 0/24px 24px;border-radius:6px;overflow:hidden}
    figure img{width:300px;height:300px;display:block;image-rendering:pixelated}figcaption{background:#18181b;padding:4px 8px;color:#aaa}
    .atlas img{width:${m.atlasW * atlasScale}px;height:${m.atlasH * atlasScale}px;image-rendering:pixelated;display:block;
      background-image:linear-gradient(#0003 1px,transparent 1px),linear-gradient(90deg,#0003 1px,transparent 1px);background-size:${atlasScale}px ${atlasScale}px}
    .row{display:flex;gap:14px;margin-top:12px;align-items:flex-start}.iss{flex:1;background:#2a2a30;padding:10px 14px;border-radius:6px}.iss li{margin-bottom:6px}.iss i{color:#999}
  </style></head><body><div class="w"><h1>${title} <small style="color:#8ce99a">${m.type} · 큐브 ${m.cubes.length} · 아틀라스 ${m.atlasW}×${m.atlasH} · density ${m.density}</small></h1>
  <div class="g">${shots.map(s => `<figure><img src="${s.src}"><figcaption>${s.label}</figcaption></figure>`).join('')}</div>
  <div class="row"><figure class="atlas"><img src="${m.atlas.toDataURL()}"><figcaption>텍스처 아틀라스 ×${atlasScale}</figcaption></figure>
  <div class="iss"><h3 style="margin:0 0 6px">모델 비평</h3><ul>${issuesHtml}</ul></div></div></div></body></html>`;
  await page.setViewportSize({ width: 1272, height: 600 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ fullPage: true });
  await page.close();
  return png;
}
