// Java 아이템 모델의 인벤토리 칸 렌더(검증용): display.gui 변환 + 정사영(칸 16 GUI px) + 왼쪽 위 빛, GUI 배율별 실제 화면 픽셀 크기
//  renderGui([{ model, texture: dataURL }], { px: 48 }) → PNG Buffer 목록
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { browser } from '../render.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PAGE = `<html><body style="margin:0;background:transparent"><canvas id="c"></canvas><script>${fs.readFileSync(path.join(ROOT, 'node_modules/three/build/three.min.js'), 'utf8')}</script>
<script>
const T = THREE, ORDER = ['east', 'west', 'up', 'down', 'south', 'north'];
window.draw = async (item, px, context) => {
  const r = new T.WebGLRenderer({ canvas: document.getElementById('c'), alpha: true, antialias: false, preserveDrawingBuffer: true });
  r.setSize(px, px); r.setPixelRatio(1); r.setClearColor(0, 0);
  const scene = new T.Scene(), cam = new T.OrthographicCamera(-8, 8, 8, -8, -200, 200); cam.position.z = 100;
  scene.add(new T.AmbientLight(0xffffff, 0.42));
  const l0 = new T.DirectionalLight(0xffffff, 0.62); l0.position.set(-0.45, 0.8, 0.6); scene.add(l0);
  const l1 = new T.DirectionalLight(0xffffff, 0.25); l1.position.set(0.5, 0.2, 0.7); scene.add(l1);
  const tex = await new T.TextureLoader().loadAsync(item.texture); tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter;
  const lit = new T.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: T.DoubleSide });
  const glow = new T.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: T.DoubleSide });
  const model = new T.Group();
  for (const e of item.model.elements) {
    const size = e.to.map((v, i) => Math.max(0.001, v - e.from[i]));
    const geo = new T.BoxGeometry(...size), uv = geo.attributes.uv;
    const keep = [];
    ORDER.forEach((f, gi) => { const fc = e.faces[f]; keep.push(!!fc); for (let k = 0; k < 4; k++) { const idx = gi * 4 + k; if (!fc) continue; const uu = uv.getX(idx), vv = uv.getY(idx), q = fc.uv; uv.setXY(idx, (q[0] + uu * (q[2] - q[0])) / 16, 1 - (q[1] + (1 - vv) * (q[3] - q[1])) / 16); } });
    geo.groups.forEach((g, gi) => { g.materialIndex = keep[gi] ? 0 : 1; });
    const mesh = new T.Mesh(geo, [e.light_emission ? glow : lit, new T.MeshBasicMaterial({ visible: false })]);
    mesh.position.set(...e.from.map((v, i) => v + size[i] / 2));
    const piv = new T.Group();
    if (e.rotation) { const o = e.rotation.origin; piv.position.set(...o); mesh.position.sub(new T.Vector3(...o)); piv.rotation[e.rotation.axis] = e.rotation.angle * Math.PI / 180; piv.add(mesh); model.add(piv); } else model.add(mesh);
  }
  model.position.set(-8, -8, -8);
  const d = item.model.display[context] || {};
  const rot = new T.Group(); rot.add(model);
  const sc = d.scale || [1, 1, 1]; rot.scale.set(...sc);
  const rr = (d.rotation || [0, 0, 0]).map(a => a * Math.PI / 180); rot.rotation.set(rr[0], rr[1], rr[2], 'XYZ');
  const top = new T.Group(); top.add(rot); const t = d.translation || [0, 0, 0]; top.position.set(...t);
  scene.add(top);
  r.render(scene, cam);
  return document.getElementById('c').toDataURL('image/png');
};
</script></body></html>`;

export async function renderGui(items, { px = 48, context = 'gui' } = {}) {
  const b = await browser();
  const page = await b.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 1 });
  await page.setContent(PAGE);
  const out = [];
  for (const it of items) {
    const url = await page.evaluate(([i, p, c]) => window.draw(i, p, c), [it, px, context]);
    out.push(Buffer.from(url.split(',')[1], 'base64'));
  }
  await page.close();
  return out;
}
