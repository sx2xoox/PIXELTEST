// 색채 엔진: OKLab/OKLCH 기반. 사람 눈에 균일한 색 공간에서 팔레트와 톤 램프를 만든다.

const toLin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGam = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = x => Math.min(1, Math.max(0, x));

export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex(rgb) {
  return '#' + rgb.map(c => Math.round(clamp01(c) * 255).toString(16).padStart(2, '0')).join('');
}

export function rgbToOklab([r, g, b]) {
  r = toLin(r); g = toLin(g); b = toLin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToRgbRaw([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(toGam);
}

const inGamut = rgb => rgb.every(c => c >= -1e-4 && c <= 1 + 1e-4);

export function oklch(L, C, H) {
  // 감마 범위를 벗어나면 채도만 줄여서 맞춘다(색상/명도 유지).
  const toRgb = c => oklabToRgbRaw([L, c * Math.cos((H * Math.PI) / 180), c * Math.sin((H * Math.PI) / 180)]);
  let rgb = toRgb(C);
  if (!inGamut(rgb)) {
    let lo = 0, hi = C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(toRgb(mid))) lo = mid; else hi = mid;
    }
    rgb = toRgb(lo);
  }
  return rgbToHex(rgb);
}

export function hexToOklch(hex) {
  const [L, a, b] = rgbToOklab(hexToRgb(hex));
  return { L, C: Math.hypot(a, b), H: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

export function mix(hexA, hexB, t = 0.5) {
  const A = rgbToOklab(hexToRgb(hexA)), B = rgbToOklab(hexToRgb(hexB));
  return rgbToHex(oklabToRgbRaw(A.map((v, i) => v + (B[i] - v) * t)));
}

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(hexA, hexB) {
  const a = luminance(hexA), b = luminance(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const LIGHTNESS = [0.975, 0.94, 0.88, 0.8, 0.71, 0.62, 0.53, 0.45, 0.37, 0.29, 0.22];

/** 하나의 색에서 50~950 톤 램프. 채도는 중간 톤에서 가장 높고 양 끝으로 갈수록 줄어든다. */
export function ramp(seedHex, { chroma } = {}) {
  const { C, H } = hexToOklch(seedHex);
  const c0 = chroma ?? C;
  const out = {};
  STEPS.forEach((step, i) => {
    const L = LIGHTNESS[i];
    const bell = Math.sin(Math.PI * Math.min(1, Math.max(0, (L - 0.12) / 0.88))) ** 0.7;
    // 어두운 쪽은 색상을 살짝 돌려서 생기를 준다(Bezold–Brücke 보정 흉내).
    const hShift = (0.62 - L) * 12;
    out[step] = oklch(L, c0 * (0.25 + 0.75 * bell), (H + hShift + 360) % 360);
  });
  return out;
}

const HARMONY = {
  mono: [0],
  analogous: [0, 30, -30],
  complementary: [0, 180, 30],
  split: [0, 150, 210],
  triadic: [0, 120, 240],
  tetradic: [0, 90, 180],
};

/** 시드 색 + 배색 규칙 → 디자인 토큰 세트 */
export function palette(seedHex, harmony = 'complementary') {
  const { L, C, H } = hexToOklch(seedHex);
  const offs = HARMONY[harmony] ?? HARMONY.complementary;
  const names = ['primary', 'secondary', 'accent'];
  const tokens = {};
  offs.forEach((o, i) => {
    const seed = i === 0 ? seedHex : oklch(L, C * (i === 2 ? 1 : 0.8), (H + o + 360) % 360);
    tokens[names[i]] = ramp(seed);
  });
  if (!tokens.secondary) tokens.secondary = tokens.primary;
  if (!tokens.accent) tokens.accent = tokens.secondary;
  // 무채색도 시드 색상을 아주 약하게 머금게 해서 팔레트가 한 덩어리로 보이게 한다.
  tokens.neutral = ramp(oklch(0.6, 0.02, H), { chroma: 0.018 });
  return tokens;
}

/** "$primary.500" / "$ink" 같은 토큰 참조를 실제 hex로 바꾼다. */
export function resolveColor(value, tokens = {}) {
  if (typeof value !== 'string' || !value.startsWith('$')) return value;
  const [name, step] = value.slice(1).split('.');
  const t = tokens[name];
  if (t === undefined) throw new Error(`Unknown color token: ${value}`);
  if (typeof t === 'string') return t;
  const v = t[step ?? 500];
  if (!v) throw new Error(`Unknown color step: ${value}`);
  return v;
}
