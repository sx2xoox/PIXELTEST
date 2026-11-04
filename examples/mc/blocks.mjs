// 블록 텍스처 세트(16×16, 타일링). 바닐라 감각을 따르되 색과 패턴은 독자적으로.
import { material } from '../../atelier/mc/materials.js';

const B = (name, mat, opt = {}, tile = 'xy') => ({ name, kind: 'block', tile, canvas: material(mat, 16, 16, opt) });

export default () => [
  B('slate_stone', 'stone', { base: '#7d8590', seed: 3 }),
  B('loam', 'dirt', { base: '#7b5538', seed: 5 }),
  B('meadow_top', 'grass', { face: 'up', base: '#74b043', seed: 2 }),
  B('meadow_side', 'grass', { face: 'north', base: '#74b043', seed: 2 }, 'x'), // 옆면은 세로로 타일링되지 않음
  B('ash_planks', 'planks', { base: '#b08d5c', seed: 8 }),
  B('ash_log', 'log', { face: 'north', bark: '#5e4a36', seed: 4 }),
  B('ash_log_top', 'log', { face: 'up', bark: '#5e4a36', inner: '#c49d66' }),
  B('rubble', 'cobble', { base: '#808389', seed: 12, stones: 7 }),
  B('willow_leaves', 'leaves', { base: '#4b8f4a', seed: 6 }),
  B('verdite_ore', 'ore', { base: '#7d8590', ore: '#3fd0a8', seed: 9, veins: 4 }),
  B('clay_bricks', 'bricks', { base: '#a35a43' }),
  B('tin_plate', 'metal', { base: '#c3c9d1' }, 'none'), // 블록마다 테두리가 보이는 게 의도
];
