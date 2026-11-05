import { beanSun, sawtooth, dMono, siot, place } from '../symbols.mjs';
const syms = [beanSun(), sawtooth(), dMono(), siot()];
const names = ['A 갈라진 원두=해돋이', 'B 톱니 지붕', 'C D 모노그램', 'D ㅅ 산'];
export default () => ({
  width: 1600, height: 640, background: '#f4ece0',
  children: syms.flatMap((s, i) => [
    place(s, 40 + i * 390, 40, 320, '#3a2418', '#e0792b'),
    place(s, 80 + i * 390, 440, 32, '#3a2418', '#e0792b'),
    place(s, 140 + i * 390, 448, 16, '#3a2418', '#e0792b'),
    place(s, 190 + i * 390, 420, 64, '#3a2418', '#3a2418'),
    { type: 'text', x: 40 + i * 390, y: 560, text: names[i], size: 24, fill: '#3a2418' },
  ]),
});
