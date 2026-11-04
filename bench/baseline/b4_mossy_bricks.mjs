// 기존 Claude 방식: 16×16 벽돌 패턴을 규칙으로 한 번에 작성(렌더 확인 없음)
import { PixelCanvas } from '../../atelier/pixel.js';
export default () => {
  const c = new PixelCanvas(16);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const row = Math.floor(y / 4);
      const off = row % 2 ? 4 : 0;
      const mortar = y % 4 === 3 || (x + off) % 8 === 7;
      let col = mortar ? '#5b5b5b' : '#8a8a8a';
      if (!mortar && (x * 7 + y * 3) % 5 === 0) col = '#7a7a7a';
      if (y < 4 && (x * 3 + y) % 4 === 0) col = '#4f7a3a';
      if (mortar && x % 3 === 0) col = '#3f6b2e';
      c.set(x, y, col);
    }
  return [{ name: 'baseline_mossy_bricks', kind: 'block', canvas: c }];
};
