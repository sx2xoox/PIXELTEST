import { markPaths, C } from '../e3.mjs';
export const P16 = { cx: 8, cy: 7.5, rx: 8, ry: 6.5, yT: 9, g: 1, rs: 4 };
export const P32 = { cx: 16, cy: 15.5, rx: 15, ry: 12.5, yT: 18, g: 3, rs: 7 };
export const scene = (p, n, bg, ink, sun) => {
  const P = markPaths(p);
  return { width: n, height: n, background: bg, children: [
    { type: 'path', d: P.sky, fill: ink }, { type: 'path', d: P.land, fill: ink }, { type: 'path', d: P.sun, fill: sun }] };
};
