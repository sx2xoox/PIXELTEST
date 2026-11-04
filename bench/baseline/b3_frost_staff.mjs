// 기존 Claude 방식: 16×16을 손으로 한 번에 지정(렌더 확인 없음). 저장만 PixelCanvas.chars 사용.
import { PixelCanvas } from '../../atelier/pixel.js';
const rows = [
  '...........cCc..',
  '..........cWCc..',
  '..........CWWC..',
  '...........CCc..',
  '..........bb....',
  '.........bb.....',
  '........bb......',
  '.......bb.......',
  '......bb........',
  '.....bb.........',
  '....bb..........',
  '...bb...........',
  '..bb............',
  '.bb.............',
  '................',
  '................',
];
const legend = { c: '#7dd3fc', C: '#38bdf8', W: '#ffffff', b: '#8b5a2b' };
export default () => [{ name: 'baseline_frost_staff', kind: 'item', canvas: new PixelCanvas(16).chars(0, 0, rows, legend) }];
