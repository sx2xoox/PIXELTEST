// 지역(세계관) 팔레트 — 재료 아이콘·갑옷·무기·몹이 모두 이 한 곳의 역할 램프를 쓴다(색 조화, docs/research/color-harmony.md)
//  피의 땅 ↔ 직업 「피의 군주」, 유령 저택 ↔ 직업 「폴터가이스트」
import { regionPalette } from '../atelier/mc/palette.js';

export const BLOOD_SPEC = {
  ink: '#1c0710', light: '#fff1d8', shadowHue: 350, lightHue: 70,
  roles: {
    primary: { hue: 22, chroma: 0.22, shift: 0.25 },                // 진홍(주)
    secondary: { hue: 10, chroma: 0.17, lift: -0.07, shift: 0.3 },  // 와인(보조)
    accent: { hue: 86, chroma: 0.17, lift: 0.11, shift: 1 },        // 금(강조 ≤10%)
    bone: { hue: 75, chroma: 0.045, lift: 0.13 },                   // 뼈(중성)
    metal: { hue: 350, chroma: 0.095, shift: 0.3 },                 // 자두빛 흑철(갑옷 몸통 → 채도를 살려 둠)(중성, 갑옷 판·낫 금속 공용)
    glow: { hue: 28, chroma: 0.22, lift: 0.14, shift: 0.8 },        // 발광 혈석(초점)
  },
};
export const GHOST_SPEC = {
  ink: '#120d24', light: '#ecfff6', shadowHue: 290, lightHue: 165,
  roles: {
    primary: { hue: 172, chroma: 0.17, lift: 0.07, shift: 0.3 },    // 엑토플라즘 민트(주)
    secondary: { hue: 305, chroma: 0.16, shift: 0.25 },             // 라벤더·벨벳(보조)
    accent: { hue: 84, chroma: 0.13, lift: 0.07, shift: 0.9 },      // 바랜 황동(강조)
    metal: { hue: 285, chroma: 0.035 },                             // 백랍(중성)
    wax: { hue: 165, chroma: 0.05, lift: 0.1 },                     // 유령 촛농(중성)
    ivory: { hue: 85, chroma: 0.04, lift: 0.1, shift: 0.6 },        // 도자기·밀랍 초(중성)
    wood: { hue: 40, chroma: 0.08, lift: -0.05, shift: 0.5 },       // 마호가니(중성)
  },
};
export const BLOOD = regionPalette(BLOOD_SPEC);
export const GHOST = regionPalette(GHOST_SPEC);
