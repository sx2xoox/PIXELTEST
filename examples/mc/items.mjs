// 아이템 스프라이트(16×16, item/generated). 독자 디자인.
// 픽셀아트 원칙: 45° 대각선(1:1 계단), 빛은 왼쪽 위, 램프는 색상 이동, 외곽선은 선택적(selout).
import { PixelCanvas, pixelRamp } from '../../atelier/pixel.js';

function emberDagger() {
  // v2: 칼날 진행 방향(왼쪽 아래 대각선)을 기준으로 모든 부품을 배치. 코등이는 그 방향에 수직.
  const c = new PixelCanvas(16);
  const steel = pixelRamp('#b9c1cc', 4, { spread: 0.11, hueShift: 14 }); // 어둠 → 밝음
  const ember = pixelRamp('#ff8a2a', 3, { spread: 0.12, hueShift: 20 });
  const wood = ['#4e3324', '#7d523a'];
  const brass = ['#a5652a', '#e3a55a'];
  const at = t => [13 - t, 2 + t]; // 칼날 중심선: t=0 칼끝 → t=8 뿌리
  for (let t = 0; t <= 8; t++) {
    const [x, y] = at(t);
    c.set(x, y - 1, steel[3]);                      // 빛 쪽(왼쪽 위) 날
    c.set(x, y, steel[2]);                          // 중심
    c.set(x + 1, y, t <= 4 ? ember[t < 2 ? 2 : t < 4 ? 1 : 0] : steel[1]); // 아랫날: 칼끝일수록 뜨겁게(그라디언트)
  }
  c.set(14, 1, steel[3]);
  // 코등이: 중심 (4,11), 칼날 방향(-1,+1)에 수직인 (+1,+1) 방향 5칸
  [[-2, brass[1]], [-1, brass[1]], [0, brass[0]], [1, brass[0]], [2, brass[0]]].forEach(([k, col]) => c.set(4 + k, 11 + k, col));
  // 손잡이: 칼날 중심선의 연장(2칸), 빛 쪽 밝게
  c.set(3, 12, wood[1]); c.set(4, 12, wood[0]); c.set(2, 13, wood[1]); c.set(3, 13, wood[0]);
  // 끝마개(불씨 보석)
  c.set(1, 14, ember[1]); c.set(2, 14, ember[0]); c.set(1, 13, ember[2]);
  return c.outline('auto');
}

function verditeGem() {
  const c = new PixelCanvas(16);
  const ramp = pixelRamp('#33c49c', 5, { spread: 0.1, hueShift: 26 });
  const shape = [[8, 1], [13, 5], [12, 11], [8, 15], [4, 11], [3, 5]];
  const m = new PixelCanvas(16).poly(shape, '#fff').mask();
  c.autoShade(m, ramp, { light: [-1, -1.2], radius: 4 });
  // 깎인 면(facet): 위 꼭짓점 → 가운데로 밝은 선, 오른쪽 아래 면은 한 단계 어둡게
  c.line(8, 2, 8, 7, ramp[4]);
  c.line(4, 6, 7, 8, ramp[3]);
  c.each((x, y) => { if (m[y * 16 + x] && x > 8 && y > 8 && x + y > 18) c.set(x, y, ramp[1]); });
  c.set(6, 4, '#ffffff'); c.set(7, 3, '#e9fff8');
  return c.outline('auto');
}

function stormFlask() {
  const c = new PixelCanvas(16);
  const glass = pixelRamp('#a9d6e5', 4, { spread: 0.08 });
  const liquid = pixelRamp('#7b5cff', 4, { spread: 0.11, hueShift: 22 });
  const body = new PixelCanvas(16).ellipse(8, 10.5, 5.5, 5, '#fff').mask();
  c.autoShade(body, glass, { light: [-1, -1], radius: 3 });
  // 액체: 몸통 아래 60%
  const liq = new Uint8Array(256);
  for (let i = 0; i < 256; i++) liq[i] = body[i] && Math.floor(i / 16) >= 9 ? 1 : 0;
  c.autoShade(liq, liquid, { light: [-1, -1], radius: 3 });
  c.hline(5, 11, 9, liquid[2]); c.set(6, 9, liquid[3]); // 수면: 한 단계 밝은 선 + 반사점
  c.set(6, 12, '#d9d0ff'); c.set(9, 13, '#d9d0ff'); // 기포(번개 기운)
  c.rect(6, 3, 4, 3, glass[1]); c.vline(6, 3, 5, glass[3]); // 목
  c.rect(6, 1, 4, 2, '#8a5a3a'); c.hline(6, 9, 1, '#b07a50'); // 코르크
  c.set(5, 8, '#ffffff'); c.set(5, 9, glass[3]); // 유리 하이라이트
  return c.outline('auto');
}

export default () => [
  { name: 'ember_dagger', kind: 'item', canvas: emberDagger() },
  { name: 'verdite_gem', kind: 'item', canvas: verditeGem() },
  { name: 'storm_flask', kind: 'item', canvas: stormFlask() },
];
