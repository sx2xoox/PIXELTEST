import { beanSun, place } from '../symbols.mjs';
const V = [
  {}, { h0: 128, rs: 56, ry: 88 }, { h0: 132, rs: 58, g: 14, ry: 92, rx: 110 }, { h0: 140, rs: 46, g: 14 },
];
export default () => ({
  width: 1600, height: 520, background: '#f4ece0',
  children: V.flatMap((v, i) => [
    place(beanSun(v), 40 + i * 390, 40, 320, '#3a2418', '#e0792b'),
    place(beanSun(v), 80 + i * 390, 420, 32, '#3a2418', '#e0792b'),
    place(beanSun(v), 140 + i * 390, 428, 16, '#3a2418', '#e0792b'),
    { type: 'text', x: 40 + i * 390, y: 500, text: JSON.stringify(v), size: 18, fill: '#3a2418' },
  ]),
});
