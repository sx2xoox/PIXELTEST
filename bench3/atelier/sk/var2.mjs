import { mark, MASTER } from '../e3.mjs';
const V = [{}, { g: 20, rs: 55 }, { g: 18, rs: 57 }, { g: 20, rs: 60, yT: 134 }];
export default () => ({ width: 1600, height: 460, background: '#f4ece0', children: V.flatMap((v, i) => [
  mark(40 + i * 390, 40, 260, '#2a1911', '#e2762b', { ...MASTER, ...v }),
  mark(60 + i * 390, 360, 26, '#2a1911', '#e2762b', { ...MASTER, ...v }),
  mark(110 + i * 390, 365, 13, '#2a1911', '#2a1911', { ...MASTER, ...v }),
  { type: 'text', x: 40 + i * 390, y: 430, text: JSON.stringify(v), size: 16, fill: '#2a1911' }]) });
