// 고해상도 스프라이트 → 복셀 돌출 모델(레퍼런스 무기들의 제작 방식: 고해상도 픽셀아트를 두께 있게 뽑아냄)
// - 투명도 마스크를 그리디 메싱으로 최소한의 직사각형으로 나눠 큐브 수를 줄인다
// - 앞/뒤(north/south) 면은 스프라이트 그 영역, 옆면은 가장자리 1px 열/행을 늘려 쓴다(바닐라 item/generated 돌출과 같은 원리)
// - 여러 레이어(칼날, 코등이, 덩굴…)를 서로 다른 z 깊이·두께로 쌓아 입체감을 만든다
// 좌표: 스프라이트 (0,0) 왼쪽 위. 모델에서는 origin(쥐는 점)에 해당하는 스프라이트 픽셀을 grip으로 지정한다.
import { PixelCanvas } from '../pixel.js';

/** 그리디 메싱: 불투명 픽셀을 직사각형 [x, y, w, h] 목록으로 */
export function greedyRects(c) {
  const used = new Uint8Array(c.w * c.h);
  const op = (x, y) => x >= 0 && y >= 0 && x < c.w && y < c.h && c.alpha(x, y) > 0 && !used[y * c.w + x];
  const rects = [];
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      if (!op(x, y)) continue;
      let w = 1; while (op(x + w, y)) w++;
      let h = 1;
      outer: for (; y + h < c.h; h++) for (let i = 0; i < w; i++) if (!op(x + i, y + h)) break outer;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used[(y + j) * c.w + x + i] = 1;
      rects.push([x, y, w, h]);
    }
  return rects;
}

/**
 * 레이어들을 하나의 텍스처(세로로 쌓음)와 큐브 목록으로.
 * layers: [{ name, canvas, z: 앞뒤 중심(유닛), depth: 두께(유닛), bone }]
 * px: 스프라이트 1px = 몇 유닛, grip: [gx, gy] 스프라이트 좌표의 쥐는 점(모델 원점), axis: 스프라이트 위 → 모델 +Y
 */
export function extrude(layers, { px = 0.3125, grip = [0, 0] } = {}) {
  // 레이어마다 불투명 영역만 잘라서(bbox) 텍스처에 세로로 쌓는다 — 같은 크기 캔버스를 그대로 쌓으면 텍스처가 낭비된다
  // 가림 제거: 더 두꺼운(같은 중심의) 레이어 안에 완전히 묻히는 픽셀은 지운다 → 같은 평면 겹침(z-fighting)과 큐브 수를 줄임
  layers = layers.map(L => {
    const cover = layers.filter(M => M !== L && M.z - M.depth / 2 <= L.z - L.depth / 2 && M.z + M.depth / 2 >= L.z + L.depth / 2 && (M.depth > L.depth || layers.indexOf(M) > layers.indexOf(L)));
    if (!cover.length) return L;
    const c = L.canvas.clone();
    c.each((x, y) => { if (c.alpha(x, y) && cover.some(M => M.canvas.alpha(x, y))) c.set(x, y, null); });
    return { ...L, canvas: c };
  });
  layers = layers.map(L => {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    L.canvas.each((x, y) => { if (L.canvas.alpha(x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } });
    if (x1 < 0) return null;
    return { ...L, canvas: L.canvas.crop(x0, y0, x1 - x0 + 1, y1 - y0 + 1), ox: x0, oy: y0 };
  }).filter(Boolean);
  const W = Math.max(...layers.map(l => l.canvas.w));
  const H = layers.reduce((s, l) => s + l.canvas.h, 0);
  const pow2 = v => 2 ** Math.ceil(Math.log2(v));
  const tex = new PixelCanvas(pow2(W), pow2(H));
  const cubes = [];
  let oy = 0;
  for (const L of layers) {
    tex.paste(L.canvas, 0, oy);
    const rects = greedyRects(L.canvas);
    rects.forEach(([x, y, w, h], i) => {
      // 스프라이트 → 모델: x는 -Z(앞) 방향? 무기 규약은 자루 +Y, 날은 -Z → 스프라이트 가로 = 모델 Z(왼쪽 = -Z 앞), 세로 = 모델 Y(위 = +Y)
      const sx = x + L.ox, sy = y + L.oy; // 원래 스프라이트 좌표
      const z0 = (sx - grip[0]) * px, z1 = (sx + w - grip[0]) * px;
      const y1 = (grip[1] - sy) * px, y0 = (grip[1] - sy - h) * px;
      const d = L.depth / 2;
      const u0 = x, v0 = oy + y, u1 = x + w, v1 = oy + y + h, cu = x + (w >> 1);
      cubes.push({
        name: `${L.name}_${i}`, bone: L.bone,
        from: [L.z - d, +y0.toFixed(4), +z0.toFixed(4)], to: [L.z + d, +y1.toFixed(4), +z1.toFixed(4)],
        faceUV: {
          // 동쪽(+X)에서 보면 오른쪽 = -Z, 서쪽에서 보면 오른쪽 = +Z → 스프라이트(왼쪽 = -Z)는 동쪽에서 좌우 반전, 서쪽에서 그대로
          east: [u1, v0, u0, v1], west: [u0, v0, u1, v1],
          north: [u0, v0, u0 + 1, v1], south: [u1 - 1, v0, u1, v1],          // 스프라이트 왼/오른쪽 가장자리 열(u = 깊이, v = 높이 → 그대로 맞음)
          // 위/아래 면은 u축이 깊이(X), v축이 길이(Z)라 가로 행을 그대로 못 씀 → 가장자리 행 가운데 텍셀 하나(외곽선 색)를 늘림
          up: [cu, v0, cu + 1, v0 + 1], down: [cu, v1 - 1, cu + 1, v1],
        },
      });
    });
    oy += L.canvas.h;
  }
  return { tex, cubes };
}
