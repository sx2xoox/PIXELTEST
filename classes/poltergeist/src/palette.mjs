// 폴터가이스트 팔레트 v2 — 색 조화: 직접 고른 hex 대신 지역 팔레트 「유령 저택」(rpg/palettes.mjs)의 역할 램프.
//  재료 아이콘·갑옷·촛대·펫·보스가 같은 잉크(외곽선)·같은 빛·같은 백랍/민트/라벤더를 공유한다. 각 램프는 어두움 → 밝음.
import { GHOST as PAL } from '../../../rpg/palettes.mjs';
export { PAL };
export const OUT = PAL.ink;                                                                       // 외곽선 = 세트 잉크
export const PEW = PAL.ramp('metal', { steps: 7, lo: 0.13, hi: 0.93, ink: false });               // 백랍(틀)
export const ECT = PAL.ramp('primary', { steps: 8, lo: 0.1, hi: 0.92, ink: false });              // 엑토플라즘(초점)
export const IVO = PAL.ramp('ivory', { steps: 6, lo: 0.22, hi: 0.86, ink: false });               // 촛농·도자기
export const VEL = PAL.ramp('secondary', { steps: 6, lo: 0.1, hi: 0.52, ink: false });            // 저택 벨벳
export const MAH = PAL.ramp('wood', { steps: 7, lo: 0.14, hi: 0.62, ink: false });                // 마호가니
