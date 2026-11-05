// 세트 팔레트(색 조화) — docs/research/color-harmony.md 실측 규칙
//  문제: 아이템마다 기준색을 따로 고르면 램프가 제각각이라 세트가 따로 논다(외곽선·하이라이트·회색이 전부 다른 색).
//  해법: 지역(세트)마다 "공유 잉크(가장 어두운 색) + 공유 빛(가장 밝은 색) + 역할 3~5개"를 정하고, 모든 재질 램프를 그 사이에 건다.
//   · 역할: primary(60%) · secondary(30%) · accent(≤10%, 최상위 등급·룬·빛) · neutral(금속·뼈·돌·유리, 지역 색으로 물든 저채도)
//   · 램프 6단 + spec: 명도는 고정 사다리(어둠 0.24 → 밝음 0.86, 바닐라 L 0.2~1.0), 중간 톤 채도가 가장 높고(바닐라 유색 0.16~0.26)
//     어둠은 공유 그림자 색상 쪽으로, 밝음은 공유 빛 색상 쪽으로 기운다(바닐라 금·블레이즈·꿀: 어둠 −15~−45°, 밝음 +20~+35°)
//   · 외곽선(0단)은 공유 잉크와 섞어서 세트 전체가 같은 "선 색"을 공유한다
import { hexToOklch, oklch, mix } from '../color.js';

const hd = (a, b) => ((b - a + 540) % 360) - 180;
const lean = (h, target, k, cap) => (h + Math.max(-cap, Math.min(cap, hd(h, target) * k)) + 360) % 360;
// 램프 모양(t = 0 어둠 → 1 밝음): 채도는 중간 톤이 가장 높고(어둠 55%, 밝음 50%), 어둠은 그림자 색상으로, 밝음은 빛 색상으로 끌린다
const cShape = t => t < 0.4 ? 0.55 + (t / 0.4) * 0.45 : t <= 0.6 ? 1 : 1 - ((t - 0.6) / 0.4) * 0.5;
const pull = t => t < 0.55 ? { to: 'shadow', k: (0.55 - t) / 0.55 } : { to: 'light', k: ((t - 0.55) / 0.45) * 0.9 };

/**
 * 재질 램프 N단(배열). role = { hue, chroma, lift = 0, shift = 0.5 }
 *  hue = 재질 색상(도), chroma = 중간 톤 최고 채도(OKLCH), lift = 명도 이동(뼈·밀랍 +0.06~0.13, 쇠 −0.04),
 *  shift = 그림자·빛 색상 쪽으로 기우는 정도(바닐라: 빨강·청록·보라 ≈0, 금·블레이즈·꿀 −15~−45°/+20~+35°)
 * opts = { steps = 6, lo = 0.25, hi = 0.84 }: 명도 범위(OKLab L). 갑옷 벨벳처럼 어두운 재질은 lo/hi를 내려서 쓴다.
 * 0단(가장 어두움)은 세트 잉크와 45% 섞는다 → 세트 전체가 같은 "선 색"을 공유한다.
 */
export function rampN(set, { hue, chroma, lift = 0, shift = 0.5 }, { steps = 6, lo = 0.25, hi = 0.84, ink = true } = {}) {
  const R = Array.from({ length: steps }, (_, i) => {
    const L = Math.max(0.06, Math.min(0.97, lo + (hi - lo) * (steps === 1 ? 0.5 : i / (steps - 1)) + lift * (i === 0 ? 0.3 : 1)));
    // 채도·색상 기울기는 램프 안의 순서가 아니라 "절대 명도"로 정한다 → 어두운 구간만 쓰는 램프(갑옷 판)도, 밝은 구간만 쓰는 램프(발광)도
    // 같은 역할이면 같은 명도에서 같은 색이 나온다(세트가 색을 공유).
    const t = Math.max(0, Math.min(1, (L - 0.25) / 0.59));
    const p = pull(t), target = p.to === 'shadow' ? set.shadowHue : set.lightHue;
    const h = lean(hue, target, p.k * Math.min(1, shift * 1.4), (p.to === 'shadow' ? 22 : 30) * shift);
    return oklch(L, chroma * cShape(t), h);
  });
  if (ink) R[0] = mix(R[0], set.ink, 0.45);
  return R;
}

/** 아이콘용 6단 램프 + 반짝임 색(세트 공유 빛) */
export function setRamp(set, role) {
  return { R: rampN(set, role), spec: set.light };
}

/**
 * 지역 팔레트. spec = {
 *   ink:'#1a0812', light:'#fff1dc', shadowHue:350, lightHue:75,
 *   roles:{ primary:{hue:24,chroma:0.21}, secondary:{hue:352,chroma:0.15}, accent:{hue:80,chroma:0.17}, bone:{hue:75,chroma:0.035,lift:0.08}, metal:{hue:20,chroma:0.03} } }
 * 돌·유리·코르크 같은 공용 재질도 지역 잉크·빛으로 만든다(회색이 따로 놀지 않게).
 */
export function regionPalette(spec) {
  const set = { ink: spec.ink, light: spec.light, shadowHue: spec.shadowHue, lightHue: spec.lightHue };
  const ramps = {};
  for (const [k, r] of Object.entries(spec.roles)) ramps[k] = setRamp(set, r);
  const { H: inkH } = hexToOklch(spec.ink);
  ramps.rock ??= setRamp(set, { hue: inkH, chroma: 0.025, lift: -0.02 });
  ramps.glass ??= setRamp(set, { hue: hexToOklch(spec.light).H, chroma: 0.03, lift: 0.08 });
  ramps.cork ??= setRamp(set, { hue: 55, chroma: 0.06, lift: -0.04 });
  // pal.ramp('metal', { steps: 7, lo: 0.15, hi: 0.9 }) — 같은 역할을 갑옷·무기·아이콘이 길이만 달리해 공유
  const ramp = (role, opts) => { const r = spec.roles[role]; if (!r) throw new Error(`역할 없음: ${role}`); return rampN(set, r, opts); };
  return { ...set, ramps, roles: spec.roles, ramp };
}

/** 세트 조화 측정: 아이콘 PixelCanvas 목록 → 색 수, 공유 색 비율, 색상 군 수, 최고 채도, 외곽선·명도 폭 */
export function harmonyReport(icons) {
  const use = new Map();
  const per = icons.map(c => {
    const cols = [...c.colors().keys()];
    cols.forEach(h => use.set(h, (use.get(h) ?? 0) + 1));
    const lc = cols.map(h => hexToOklch(h));
    return { Lmin: Math.min(...lc.map(o => o.L)), Lmax: Math.max(...lc.map(o => o.L)), Cmax: Math.max(...lc.map(o => o.C)) };
  });
  const all = [...use.keys()];
  // 색상 군: 채도 0.04 이상 색을 면적 무관하게 25° 안쪽끼리 묶는다
  const hues = all.map(h => hexToOklch(h)).filter(o => o.C >= 0.04).map(o => o.H).sort((a, b) => a - b);
  let groups = 0; for (let i = 0; i < hues.length; i++) if (i === 0 || hues[i] - hues[i - 1] > 25) groups++;
  if (hues.length > 1 && groups > 1 && 360 - hues.at(-1) + hues[0] <= 25) groups--;
  const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
  const sd = a => Math.sqrt(avg(a.map(v => (v - avg(a)) ** 2)));
  return {
    icons: icons.length,
    colors: all.length,
    shared: +(all.filter(h => use.get(h) >= 2).length / all.length).toFixed(2),
    hueGroups: groups,
    peakChroma: +avg(per.map(p => p.Cmax)).toFixed(3),
    outlineL: +avg(per.map(p => p.Lmin)).toFixed(2), outlineSd: +sd(per.map(p => p.Lmin)).toFixed(2),
    valueSpan: +avg(per.map(p => p.Lmax - p.Lmin)).toFixed(2),
  };
}
