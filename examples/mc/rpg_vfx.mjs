// RPG 이펙트 세트(흑백 = 서버가 원소 색으로 틴트). use:
//  'item'     → 프레임별 평면 모델 + items/vfx_<name>.json(range_dispatch: custom_model_data floats[0] = 프레임)
//  'loop'     → 세로 스트립 + .png.mcmeta(반복). 마법진·빔처럼 계속 도는 효과
//  'particle' → 바닐라 파티클 재텍스처(같은 파티클 전체가 바뀜 — generic_* 공유 25종은 피할 것). 바닐라와 같은 프레임 수·크기로
import { slashArc, shockRing, hitSpark, magicCircle, beam, ELEMENTS } from '../../atelier/mc/vfx.js';

export default () => [
  { name: 'slash', use: 'item', frames: slashArc({ size: 32, frames: 6 }), preview: ELEMENTS.ice },
  { name: 'shockwave', use: 'item', frames: shockRing({ size: 32, frames: 6 }), preview: ELEMENTS.fire },
  { name: 'hit_spark', use: 'item', frames: hitSpark({ size: 16, frames: 4 }), preview: ELEMENTS.holy },
  // 바닐라 sweep_attack은 32×32 × 8프레임 시퀀스(jar 확인) → 같은 규격으로 교체하면 근접 공격 검기 자체가 바뀐다
  { name: 'sweep_attack', use: 'particle', particle: 'sweep_attack', frames: slashArc({ size: 32, frames: 8 }), preview: ELEMENTS.ice },
  { name: 'rune_circle', use: 'loop', frametime: 3, frames: magicCircle({ size: 64, folds: 6, frames: 8, seed: 5 }), preview: ELEMENTS.shadow },
  { name: 'loot_beam', use: 'loop', frametime: 2, frames: beam({ w: 16, h: 64, frames: 4 }), preview: ELEMENTS.poison },
];
