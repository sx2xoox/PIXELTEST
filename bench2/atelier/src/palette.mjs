// 피의 군주 공통 팔레트·재질 — 6개 에셋이 한 세계로 보이도록 같은 램프만 쓴다(바닐라처럼 색 절제)
import { PixelCanvas, tileNoise } from '../../../atelier/pixel.js';
import { rng } from '../../../atelier/geom.js';

export const BLOOD = ['#2e0810', '#5a0d1a', '#8c1626', '#bf2633', '#e8494f'];   // 어둠 → 밝음
export const IRON = ['#16131a', '#241f29', '#363039', '#4d4552', '#6e6474'];
export const BONE = ['#7d6f5c', '#a99a82', '#cfc2a8', '#ece2cc'];
export const GLOW = ['#ff3b46', '#ff8a7a', '#ffd9cc'];                           // 발광(초점)

const pick = (r, t) => r[Math.max(0, Math.min(r.length - 1, Math.floor(t * r.length)))];

/** 흑철 판: 2톤 노이즈 + 위 모서리 밝게 + 아래 그림자 + (큰 면) 리벳 */
export function iron(w, h, face, { rivets = true, seed = 1 } = {}) {
  const c = new PixelCanvas(w, h);
  const n = tileNoise(w, h, { cell: 4, seed, octaves: 1 });
  c.each((x, y) => c.set(x, y, n[y * w + x] > 0.62 ? IRON[3] : IRON[2]));
  if (face !== 'up' && face !== 'down' && h > 2) { c.hline(0, w - 1, 0, IRON[4]); c.hline(0, w - 1, h - 1, IRON[1]); }
  if (rivets && w >= 6 && h >= 6) for (const [x, y] of [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]]) c.set(x, y, IRON[4]);
  return c;
}
/** 굳은 피·살점: 3톤 노이즈 + 어두운 혈관 */
export function flesh(w, h, face, { seed = 2, dark = false } = {}) {
  const c = new PixelCanvas(w, h);
  const n = tileNoise(w, h, { cell: dark ? 5 : 3, seed, octaves: dark ? 1 : 2 });
  // dark: 거대한 면에서는 밝은 단계가 얼룩(위장무늬)처럼 보임 → 어두운 3단, 큰 덩어리
  c.each((x, y) => c.set(x, y, pick(dark ? BLOOD.slice(0, 3) : BLOOD.slice(1, 4), n[y * w + x])));
  if (dark && face !== 'up' && face !== 'down' && h > 3) c.hline(0, w - 1, 0, BLOOD[2]);
  const R = rng(seed + 9);
  for (let k = 0; k < Math.max(1, (w * h) / 40); k++) { let x = Math.floor(R() * w), y = Math.floor(R() * h); for (let i = 0; i < 4; i++) { c.set(x, y, BLOOD[0]); x += R() < 0.5 ? 1 : 0; y += 1; } }
  return c;
}
/** 뼈: 밝은 2톤 + 위 밝게 + 잔금 */
export function bone(w, h, face, { seed = 3, aged = false } = {}) {
  const c = new PixelCanvas(w, h);
  const n = tileNoise(w, h, { cell: 4, seed, octaves: 1 });
  // aged: 보스용 바랜 뼈(가장 밝은 단계 제외) — 깨끗한 흰 뼈는 장난감처럼 보임
  c.each((x, y) => c.set(x, y, aged ? (n[y * w + x] > 0.6 ? BONE[2] : BONE[1]) : (n[y * w + x] > 0.6 ? BONE[3] : BONE[2])));
  if (face !== 'up' && face !== 'down' && h > 2) c.hline(0, w - 1, h - 1, aged ? BONE[0] : BONE[1]);
  const R = rng(seed + 5);
  for (let k = 0; k < Math.max(1, (w * h) / 50); k++) { const x = Math.floor(R() * w), y = Math.floor(R() * h); c.set(x, y, BONE[0]); c.set(x + 1, y + 1, BONE[1]); }
  return c;
}
/** 발광 핵(심장·보석·눈): 가운데가 가장 밝은 3단 */
export function glow(w, h) {
  const c = new PixelCanvas(w, h);
  c.each((x, y) => { const d = Math.max(Math.abs(x + 0.5 - w / 2) / (w / 2), Math.abs(y + 0.5 - h / 2) / (h / 2)); c.set(x, y, d < 0.34 ? GLOW[2] : d < 0.7 ? GLOW[1] : GLOW[0]); });
  return c;
}
/** 피 칼날: 바깥 날(아래 가장자리) 가장 밝은 선 + 날 몸통 그라디언트 + 등(위)은 흑철 */
export function bladeFace(w, h, face) {
  const c = new PixelCanvas(w, h);
  if (face === 'up' || face === 'down') return c.fill(face === 'up' ? IRON[2] : BLOOD[4]);
  c.each((x, y) => { const t = y / Math.max(1, h - 1); c.set(x, y, t < 0.2 ? IRON[3] : t < 0.45 ? BLOOD[1] : t < 0.75 ? BLOOD[2] : t < 0.9 ? BLOOD[3] : BLOOD[4]); });
  return c;
}
