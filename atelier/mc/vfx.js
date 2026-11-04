// RPG VFX 생성기 — 프레임 스프라이트(파티클 재텍스처·디스플레이 엔티티 아이템 모델·반복 애니메이션 텍스처용)
//
// 검증된 전제(바닐라 클라이언트 jar 1.21.4 / 26.3에서 직접 확인):
//  - 파티클 정의: assets/<ns>/particles/<id>.json = { "textures": ["ns:name_0", ...] }
//    sweep_attack = 32×32 × 8프레임, dust 등 25종 파티클이 generic_0..7(8×8)을 공유 → generic 교체 금지
//  - 파티클 텍스처도 .png.mcmeta 애니메이션 지원(vibration.png.mcmeta)
//  - 아이템 모델 정의(items/*.json)의 range_dispatch 속성과 tint 소스에 "custom_model_data"가 등록되어 있음
//    → 흑백 텍스처 1장을 서버가 colors로 원소별 색을 입히고, floats로 프레임을 고른다
// 모든 생성기는 기본이 "틴트용 흑백"(흰색 = 최대 밝기, 틴트는 곱연산). 투명 픽셀 RGB는 이웃 색으로 채워 밉맵 번짐을 막는다.
import { PixelCanvas, bayer } from '../pixel.js';
import { rng } from '../geom.js';
import { hexToRgb, rgbToHex } from '../color.js';

export const GRAY = ['#5c5c5c', '#8f8f8f', '#c4c4c4', '#ebebeb', '#ffffff']; // 어둠 → 밝음

/** 장(field) → 픽셀: 4×4 슈퍼샘플 평균 세기를 단계로 양자화(안티앨리어싱 없는 또렷한 픽셀) */
export function fieldToCanvas(size, field, { ramp = GRAY, cut = 0.14, ss = 4, alpha = 'cutout' } = {}) {
  const c = new PixelCanvas(size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let v = 0;
      for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) v += Math.max(0, Math.min(1, field(x + (i + 0.5) / ss, y + (j + 0.5) / ss)));
      v /= ss * ss;
      if (v < cut) continue;
      const t = (v - cut) / (1 - cut);
      const col = ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))];
      if (alpha === 'translucent') c.set(x, y, col + Math.round(80 + 175 * Math.min(1, t * 1.3)).toString(16).padStart(2, '0'));
      else c.set(x, y, col);
    }
  return bleedRGB(c);
}

/** 투명 픽셀의 RGB를 가장 가까운 불투명 이웃 색으로 채운다(알파 0 유지) — 밉맵/필터링 시 검은 테두리 방지 */
export function bleedRGB(c) {
  const d = c.data, w = c.w, h = c.h;
  for (let pass = 0; pass < 2; pass++) {
    const src = new Uint8ClampedArray(d);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] !== 0) continue;
        let n = 0, r = 0, g = 0, b = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const k = (ny * w + nx) * 4;
          if (src[k + 3] === 0 && !(src[k] | src[k + 1] | src[k + 2])) continue;
          r += src[k]; g += src[k + 1]; b += src[k + 2]; n++;
        }
        if (n) { d[i] = r / n; d[i + 1] = g / n; d[i + 2] = b / n; }
      }
  }
  return c;
}

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/**
 * 베기 궤적(반달 검기). 프레임마다 호가 그려지며 펼쳐지고 끝부분부터 사라진다.
 * 굵기: 머리(최근) 굵고 꼬리 가늘게, 안쪽 가장자리가 가장 밝은 '칼날 심'.
 */
export function slashArc({ size = 32, frames = 6, start = -150, sweep = 200, radius = 0.4, width = 0.16 } = {}) {
  const out = [];
  const R = size * radius, cx = size / 2, cy = size / 2;
  for (let k = 0; k < frames; k++) {
    const p = frames === 1 ? 0.6 : k / (frames - 1);
    const head = start + sweep * Math.min(1, 0.25 + p * 1.1);      // 칼끝 진행
    const tail = start + sweep * Math.max(0, (p - 0.45) * 1.6);       // 뒤에서부터 소멸
    const fade = 1 - smooth(0.7, 1, p);
    out.push(fieldToCanvas(size, (x, y) => {
      const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
      const a = (Math.atan2(dy, dx) * 180) / Math.PI;
      const fromTail = ((a - tail + 720) % 360), span = ((head - tail + 720) % 360);
      if (fromTail > span) return 0;
      const u = span ? fromTail / span : 0;                           // 0 꼬리 → 1 머리
      const w = size * width * (0.25 + 0.75 * u ** 0.7);             // 머리로 갈수록 굵게
      const off = r - R;
      if (off < -w * 0.35 || off > w) return 0;
      const core = 1 - Math.abs(off - w * 0.05) / w;                  // 안쪽 가장자리가 가장 밝음
      return Math.max(0, core) * (0.35 + 0.65 * u) * fade * 1.25;
    }));
  }
  return out;
}

/** 충격파 링: 반지름이 커지면서 얇아지고 흐려진다 */
export function shockRing({ size = 32, frames = 6, from = 0.08, to = 0.46, width = 0.12 } = {}) {
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / Math.max(1, frames - 1);
    const r = size * (from + (to - from) * (1 - (1 - p) ** 2)); // ease-out
    const w = size * width * (1 - 0.7 * p);
    const fade = 1 - smooth(0.55, 1, p);
    out.push(fieldToCanvas(size, (x, y) => {
      const d = Math.abs(Math.hypot(x - size / 2, y - size / 2) - r);
      return (1 - d / w) * fade * 1.2;
    }));
  }
  return out;
}

/** 타격 스파크: 4방향 광선 + 대각 짧은 광선, 빠르게 수축 */
export function hitSpark({ size = 16, frames = 4 } = {}) {
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / Math.max(1, frames - 1);
    const L = size * (0.48 - 0.3 * p), Ld = L * 0.55, t = 0.9 - 0.4 * p;
    out.push(fieldToCanvas(size, (x, y) => {
      const dx = Math.abs(x - size / 2), dy = Math.abs(y - size / 2);
      const axis = Math.max(dx < t ? 1 - dy / L : 0, dy < t ? 1 - dx / L : 0);
      const diag = Math.abs(dx - dy) < t * 0.8 ? 1 - Math.hypot(dx, dy) / Ld : 0;
      const core = 1 - Math.hypot(dx, dy) / (size * 0.12);
      return Math.max(axis, diag * 0.8, core) * (1 - 0.35 * p) * 1.2;
    }, { cut: 0.2 }));
  }
  return out;
}

/** 마법진: 동심원 + n각 별 + 룬 띠 + 눈금. frames>1이면 룬 띠가 회전하는 반복 애니메이션(대칭 덕에 끊김 없이 이어짐) */
export function magicCircle({ size = 64, folds = 6, frames = 1, seed = 3, runes = 12 } = {}) {
  const R = rng(seed);
  // 룬: 3×5 획 조합(시드 고정)
  const glyphs = Array.from({ length: runes }, () => {
    const g = [];
    const strokes = 2 + Math.floor(R() * 2);
    for (let s = 0; s < strokes; s++) {
      const vertical = R() < 0.5, pos = Math.floor(R() * 3), from = Math.floor(R() * 3), len = 2 + Math.floor(R() * 3);
      for (let i = 0; i < len; i++) g.push(vertical ? [pos, Math.min(4, from + i)] : [Math.min(2, from + i - 1 < 0 ? 0 : from + i - 1), Math.min(4, pos + 1)]);
    }
    return g;
  });
  const out = [];
  const c0 = size / 2;
  for (let k = 0; k < frames; k++) {
    const rot = (k / frames) * (2 * Math.PI / runes); // 룬 하나 간격만큼 돌면 다시 같은 그림 → 반복 이음 없음
    const base = fieldToCanvas(size, (x, y) => {
      const dx = x - c0, dy = y - c0, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const ring = (rr, w) => 1 - Math.abs(r - rr) / w;
      let v = Math.max(ring(size * 0.47, 0.9), ring(size * 0.4, 0.7), ring(size * 0.24, 0.7) * 0.85);
      // n각 별: 꼭짓점 사이를 잇는 직선
      for (let i = 0; i < folds; i++) {
        const a1 = (i / folds) * 2 * Math.PI - Math.PI / 2, a2 = ((i + 2) / folds) * 2 * Math.PI - Math.PI / 2;
        const p1 = [Math.cos(a1) * size * 0.4, Math.sin(a1) * size * 0.4], p2 = [Math.cos(a2) * size * 0.4, Math.sin(a2) * size * 0.4];
        const ex = p2[0] - p1[0], ey = p2[1] - p1[1], L = Math.hypot(ex, ey);
        const tproj = ((dx - p1[0]) * ex + (dy - p1[1]) * ey) / (L * L);
        if (tproj > 0 && tproj < 1) v = Math.max(v, (1 - Math.abs(((dx - p1[0]) * ey - (dy - p1[1]) * ex) / L) / 0.6) * 0.75);
      }
      // 바깥 띠 눈금
      const tick = Math.abs(angDiff(a * 24, 0)) < 0.35 && r > size * 0.42 && r < size * 0.46 ? 0.7 : 0;
      return Math.max(v, tick);
    });
    // 룬: 두 원 사이 띠에 배치(회전)
    for (let i = 0; i < runes; i++) {
      const a = (i / runes) * 2 * Math.PI + rot;
      const gx = Math.round(c0 + Math.cos(a) * size * 0.435 - 1), gy = Math.round(c0 + Math.sin(a) * size * 0.435 - 2);
      if (size >= 64) for (const [px, py] of glyphs[i]) base.set(gx + px, gy + py, GRAY[3]);
    }
    // 중심 표식
    base.set(c0, c0, '#ffffff'); base.set(c0 - 1, c0, GRAY[3]); base.set(c0, c0 - 1, GRAY[3]);
    out.push(bleedRGB(base));
  }
  return out;
}

/**
 * 세로 빛기둥(루트 빔/치유 기둥). v2: 사인 변조가 폭까지 출렁여 '꽃병'처럼 보였음 →
 * 폭은 고정(밝은 심 + 은은한 가장자리), 아래가 진하고 위로 갈수록 흐려지며, 흐름은 위로 올라가는 빛 입자로만 표현.
 * 입자는 프레임마다 h/frames씩 올라가 마지막 프레임 다음이 첫 프레임과 이어진다(끊김 없는 반복).
 */
export function beam({ w = 16, h = 64, frames = 4, motes = 7, seed = 2 } = {}) {
  const R = rng(seed);
  const pts = Array.from({ length: motes }, () => [1 + Math.floor(R() * (w - 2)), Math.floor(R() * h), R() < 0.4 ? 2 : 1]);
  const out = [];
  for (let k = 0; k < frames; k++) {
    const c = new PixelCanvas(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const d = Math.abs(x + 0.5 - w / 2) / (w / 2);                 // 0 중심 → 1 가장자리
        const vfade = 0.25 + 0.75 * (y / (h - 1)) ** 1.2;               // 위(0)는 흐리게, 아래는 진하게
        const glow = (1 - d) ** 1.6 * vfade;
        const core = d < 0.14 ? 0.35 * vfade + 0.6 : 0;
        const v = Math.max(glow, core * vfade);
        if (v < 0.16) continue;
        c.set(x, y, GRAY[Math.min(4, Math.floor(v * 5))]);
      }
    for (const [x, y0, s] of pts) {
      const y = ((y0 - Math.round((k * h) / frames)) % h + h) % h;     // 위로 이동
      for (let i = 0; i < s; i++) c.set(x, (y + i) % h, '#ffffff');
    }
    out.push(bleedRGB(c));
  }
  return out;
}

/** 프레임 → 세로 스트립(.png.mcmeta 반복 애니메이션용) */
export function strip(frames) {
  const w = frames[0].w, h = frames[0].h;
  if (frames.some(f => f.w !== w || f.h !== h)) throw new Error('모든 프레임은 같은 크기여야 함');
  const c = new PixelCanvas(w, h * frames.length);
  frames.forEach((f, i) => c.paste(f, 0, i * h));
  return c;
}
export const mcmeta = ({ frametime = 2, interpolate = false } = {}) => ({ animation: { frametime, interpolate } });

/** 틴트 미리보기: 흑백 × 색(게임의 곱연산과 동일) */
export function tint(c, hex) {
  const [tr, tg, tb] = hexToRgb(hex);
  const o = new PixelCanvas(c.w, c.h);
  o.data.set(c.data);
  for (let i = 0; i < o.data.length; i += 4) { o.data[i] *= tr; o.data[i + 1] *= tg; o.data[i + 2] *= tb; }
  return o;
}
export const ELEMENTS = { fire: '#ff8a3c', ice: '#8fd8ff', poison: '#8be36a', holy: '#ffe9a0', shadow: '#a77bff', blood: '#ff4a5a' };
export const intColor = hex => parseInt(hex.slice(1), 16);
void rgbToHex;

/** VFX 프레임 검사 */
export function critiqueFrames(name, frames, { use = 'item' } = {}) {
  const issues = [];
  const add = (severity, msg, fix = '') => issues.push({ severity, msg, fix });
  const { w, h } = frames[0];
  const pow2 = v => (v & (v - 1)) === 0;
  if (!pow2(w) || !pow2(h)) add('warn', `${name}: ${w}×${h} — 2의 거듭제곱이 아님`, '아틀라스/밉맵 안정성을 위해 8·16·32·64…');
  if (frames.some(f => f.w !== w || f.h !== h)) add('error', `${name}: 프레임 크기 불일치`);
  const cover = frames.map(f => { let n = 0; f.each((x, y) => { if (f.alpha(x, y) > 0) n++; }); return n / (w * h); });
  if (cover.some(v => v === 0) && use !== 'particle') add('info', `${name}: 빈 프레임 있음`, '일회성 연출의 마지막 프레임이면 정상');
  if (frames.length > 1) {
    const diffs = frames.slice(1).map((f, i) => { let d = 0; f.each((x, y) => { if ((f.alpha(x, y) > 0) !== (frames[i].alpha(x, y) > 0)) d++; }); return d / (w * h); });
    if (Math.max(...diffs) > 0.35) add('warn', `${name}: 인접 프레임 변화가 큼(${(Math.max(...diffs) * 100).toFixed(0)}%) → 깜빡임처럼 보일 수 있음`, '프레임 수를 늘리거나 변화량을 줄이세요.');
  }
  if (use === 'particle' && w > 32) add('info', `${name}: 파티클 ${w}px — 바닐라는 8~32px`, '화면 크기는 텍스처가 아니라 파티클 코드가 정한다.');
  return issues;
}

// ---------------------------------------------------------------------------
// 피(액체) 계열 이펙트
// ---------------------------------------------------------------------------
/** 피 베기: slashArc + 바깥 가장자리 톱니(찢김) + 꼬리에서 떨어지는 방울. 방향(sweep 부호)으로 1·2타를 구분한다 */
export function bloodSlash({ size = 32, frames = 6, start = -150, sweep = 200, radius = 0.4, width = 0.17, seed = 1, drops = 6 } = {}) {
  const R = rng(seed);
  const jag = Array.from({ length: 24 }, () => 0.75 + R() * 0.5);
  const dr = Array.from({ length: drops }, () => [R(), 0.6 + R() * 0.8]);
  const out = [];
  const cx = size / 2, cy = size / 2, Rr = size * radius;
  const dir = Math.sign(sweep) || 1, sw = Math.abs(sweep);
  for (let k = 0; k < frames; k++) {
    const p = frames === 1 ? 0.6 : k / (frames - 1);
    const headU = Math.min(1, 0.2 + p * 1.15), tailU = Math.max(0, (p - 0.4) * 1.7), fade = 1 - smooth(0.72, 1, p);
    const c = fieldToCanvas(size, (x, y) => {
      const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
      let a = (Math.atan2(dy, dx) * 180) / Math.PI;
      const rel = (((a - start) * dir) % 360 + 360) % 360;   // 시작각부터 진행 방향으로 잰 각도
      const u = rel / sw;
      if (u < tailU || u > headU) return 0;
      const lu = (u - tailU) / Math.max(1e-3, headU - tailU);
      const w = size * width * (0.2 + 0.8 * lu ** 0.6) * jag[Math.floor(u * 23)];
      const off = r - Rr;
      if (off < -w * 0.3 || off > w) return 0;
      return Math.max(0, 1 - Math.abs(off - w * 0.08) / w) * (0.4 + 0.6 * lu) * fade * 1.3;
    });
    // 꼬리 쪽에서 아래로 떨어지는 방울(중력)
    if (p > 0.3) for (const [ru, sp] of dr) {
      const ang = ((start + dir * sw * Math.max(tailU, ru * headU)) * Math.PI) / 180;
      const x = Math.round(cx + Math.cos(ang) * Rr), y = Math.round(cy + Math.sin(ang) * Rr + (p - 0.3) * size * 0.35 * sp);
      if (y < size && p < 0.98) { c.set(x, y, GRAY[3]); if (sp > 1) c.set(x, y - 1, GRAY[2]); }
    }
    out.push(bleedRGB(c));
  }
  return out;
}

/** 핏방울 비산: 중심에서 방사형으로 튀고 아래로 떨어지며 작아진다 */
export function bloodSplatter({ size = 32, frames = 6, count = 14, seed = 4 } = {}) {
  const R = rng(seed);
  const ps = Array.from({ length: count }, () => { const a = R() * Math.PI * 2; return { a, v: 0.25 + R() * 0.5, s: 1 + Math.floor(R() * 3) }; });
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / Math.max(1, frames - 1);
    const c = new PixelCanvas(size);
    // 중심 폭발(초반)
    if (p < 0.45) { const rr = size * (0.1 + p * 0.35); for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2); if (d < rr) c.set(x, y, GRAY[d < rr * 0.5 ? 4 : 3 - Math.floor(p * 4)] ?? GRAY[1]); } }
    for (const q of ps) {
      const d = q.v * size * 0.5 * (1 - (1 - p) ** 2);
      const x = Math.round(size / 2 + Math.cos(q.a) * d), y = Math.round(size / 2 + Math.sin(q.a) * d + p * p * size * 0.25);
      const s = Math.max(1, Math.round(q.s * (1 - p * 0.7)));
      if (p < 0.97) c.rect(x, y, s, s, GRAY[s > 1 ? 4 : 3]);
    }
    out.push(bleedRGB(c));
  }
  return out;
}

/** 혈창: 바닥에서 솟아오르는 뾰족한 가시(세로 스프라이트). 솟음 → 정지 → 가라앉음 */
export function bloodSpike({ w = 16, h = 32, frames = 6 } = {}) {
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / Math.max(1, frames - 1);
    const rise = p < 0.35 ? p / 0.35 : p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    const top = h - Math.round(h * 0.95 * rise);
    out.push((() => {
      const c = new PixelCanvas(w, h);
      for (let y = top; y < h; y++) {
        const t = (y - top) / Math.max(1, h - top);          // 0 끝 → 1 바닥
        const half = (w / 2) * (0.12 + 0.88 * t ** 0.9);
        for (let x = 0; x < w; x++) {
          const d = Math.abs(x + 0.5 - w / 2);
          if (d > half) continue;
          const edge = d / half;
          const v = edge > 0.75 ? 1 : t < 0.15 ? 4 : x + 0.5 < w / 2 ? 3 : 2;  // 왼쪽(빛)이 밝고 가장자리 어둡게
          c.set(x, y, GRAY[v]);
        }
      }
      return bleedRGB(c);
    })());
  }
  return out;
}

/** 피의 소용돌이(반복): 나선 팔 n개가 회전. 회전량이 팔 간격과 같아 끊김 없이 반복된다 */
export function bloodVortex({ size = 64, frames = 8, arms = 3, seed = 2 } = {}) {
  const out = [];
  for (let k = 0; k < frames; k++) {
    const rot = (k / frames) * (2 * Math.PI / arms);
    out.push(fieldToCanvas(size, (x, y) => {
      const dx = x - size / 2, dy = y - size / 2, r = Math.hypot(dx, dy) / (size / 2);
      if (r > 1) return 0;
      const a = Math.atan2(dy, dx) - rot + r * 4.2;
      const arm = Math.cos(a * arms) * 0.5 + 0.5;
      return arm ** 3 * (1 - r ** 2) * 1.6 + (r < 0.15 ? 0.9 : 0);
    }));
  }
  void seed;
  return out;
}

// ---------------------------------------------------------------------------
// v2 연출용: 컬러 램프 스프라이트(흰빛 심 하이라이트), 디더 소멸, 결정 가시 다발, 핏빛 달, 웅덩이, 섬광
// (흑백 + tint는 곱연산이라 흰 하이라이트를 못 낸다 → 연출 핵심 스프라이트는 피 램프로 직접 칠한다)
// ---------------------------------------------------------------------------
export const BLOOD_FX = ['#3a0a12', '#7a1220', '#c41e2c', '#ff4b4f', '#ffd6cc'];

/** 디더 소멸: 프레임 하나를 n단계에 걸쳐 Bayer 순서로 지워 간다(끝이 뚝 끊기지 않게) */
export function dissolve(frame, n = 4) {
  const out = [];
  for (let k = 1; k <= n; k++) {
    const c = frame.clone(), th = k / (n + 1);
    c.each((x, y) => { const b = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)] / 16; if (b < th) c.set(x, y, null); });
    out.push(c);
  }
  return out;
}

/** 핏방울(위가 뾰족, 왼쪽 위 하이라이트) */
export function bloodDrop(size = 8) {
  return fieldToCanvas(size, (x, y) => {
    const cx = size / 2, t = y / size;
    const half = t < 0.45 ? (t / 0.45) * size * 0.22 : Math.sqrt(Math.max(0, 1 - ((t - 0.68) / 0.32) ** 2)) * size * 0.34;
    const d = Math.abs(x - cx);
    if (d > half) return 0;
    return 0.55 + 0.45 * (1 - d / Math.max(0.5, half)) * (x < cx ? 1 : 0.5) * (t > 0.5 && t < 0.75 ? 1 : 0.6);
  }, { ramp: BLOOD_FX, cut: 0.1 });
}

/** 핏빛 달 v2: 개기월식처럼 검붉은 원판 + 왼쪽 위 가장자리만 빛나는 테 + 은은한 무늬 + 부드러운 코로나(디더). frames는 코로나 일렁임 */
export function bloodMoon({ size = 64, frames = 4, seed = 3 } = {}) {
  const R = rng(seed);
  const maria = Array.from({ length: 5 }, () => [(R() - 0.5) * 0.7, (R() - 0.5) * 0.7, 0.12 + R() * 0.14]);
  const out = [];
  for (let k = 0; k < frames; k++) {
    const c = new PixelCanvas(size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const nx = (x + 0.5 - size / 2) / (size / 2), ny = (y + 0.5 - size / 2) / (size / 2), r = Math.hypot(nx, ny);
        if (r < 0.74) {
          const limb = (-nx * 0.7 - ny * 0.7) / Math.max(0.01, r);               // 왼쪽 위 방향 성분
          const edge = r / 0.74;
          let v = 1.4 + (edge > 0.82 && limb > 0.2 ? 2 : edge > 0.88 ? 1 : 0) + (limb > 0.4 && edge > 0.6 ? 0.6 : 0);
          if (maria.some(([mx, my, mr]) => Math.hypot(nx - mx, ny - my) < mr)) v -= 0.8;
          v += (bayer(x, y) - 0.5) * 0.5;
          c.set(x, y, BLOOD_FX[Math.max(0, Math.min(4, Math.floor(v)))]);
        } else if (r < 0.98) {
          const t = (r - 0.74) / 0.24, wob = 0.85 + 0.15 * Math.sin(Math.atan2(ny, nx) * 5 + k * 1.5);
          if (bayer(x + k, y) < (1 - t) * 0.75 * wob) c.set(x, y, t < 0.35 ? BLOOD_FX[2] : BLOOD_FX[1]);
        }
      }
    out.push(bleedRGB(c));
  }
  return out;
}

/** 피 웅덩이: 불규칙한 가장자리로 번져 나감(frames), 가운데 어둡고 가장자리 반짝임 */
export function bloodPool({ size = 64, frames = 6, seed = 6 } = {}) {
  const R = rng(seed);
  const lobes = Array.from({ length: 9 }, () => 0.62 + R() * 0.55); // v2: 더 불규칙하게
  const out = [];
  for (let k = 0; k < frames; k++) {
    const g = 0.25 + 0.75 * (1 - (1 - k / Math.max(1, frames - 1)) ** 2);
    out.push(fieldToCanvas(size, (x, y) => {
      const nx = (x - size / 2) / (size / 2), ny = (y - size / 2) / (size / 2);
      const a = Math.atan2(ny, nx), i = ((a / (2 * Math.PI)) * 9 + 9) % 9;
      const lob = lobes[Math.floor(i)] * (1 - (i % 1)) + lobes[(Math.floor(i) + 1) % 9] * (i % 1);
      const r = Math.hypot(nx, ny) / (0.92 * g * lob);
      if (r > 1) return 0;
      // v2: 가운데 밝은 점(달걀처럼 보임) 제거 — 안쪽은 고른 어두운 피, 반사광은 왼쪽 위 가장자리에만
      const sheen = r > 0.84 && nx + ny < -0.3 ? 0.75 : r > 0.9 ? 0.5 : 0.36;
      return sheen;
    }, { ramp: BLOOD_FX, cut: 0.1 }));
  }
  return out;
}

/** 초승달 칼날(정지 스프라이트, 회전 키로 돌린다): 앞쪽 머리가 흰빛 심, 꼬리로 갈수록 가늘고 어둡게 + 디더 잔상 */
export function crescentBlade({ size = 64, span = 160, width = 0.16, ramp = BLOOD_FX } = {}) {
  const cx = size / 2, cy = size / 2, R = size * 0.4;
  return fieldToCanvas(size, (x, y) => {
    const a = ((Math.atan2(y - cy, x - cx) * 180) / Math.PI + 360) % 360;   // 0..360, 머리 = 0°
    if (a > span) return 0;
    const u = 1 - a / span;                                                   // 1 머리 → 0 꼬리
    const w = size * width * (0.15 + 0.85 * u ** 0.8);
    const off = Math.hypot(x - cx, y - cy) - R;
    if (off < -w * 0.4 || off > w * 0.6) return 0;
    const core = 1 - Math.abs(off) / w;
    const v = core * (0.3 + 0.7 * u);
    return u < 0.35 && bayer(Math.floor(x), Math.floor(y)) > u * 2.4 ? 0 : v * 1.35;  // 꼬리 디더 잔상
  }, { ramp, cut: 0.1 });
}

/** 결정 가시 다발: 가운데 큰 가시 + 양옆 기울어진 작은 가시. 깎인 면(왼쪽 밝음/오른쪽 어둠) + 능선 하이라이트 + 깨진 끝 */
export function spikeCluster({ w = 32, h = 48, frames = 8 } = {}) {
  const spikes = [[0.5, 1.0, 0.21, 0], [0.25, 0.6, 0.15, -0.26], [0.76, 0.68, 0.15, 0.24]];   // [x, 높이, 반폭, 기울기] v2: 바늘처럼 가늘어 두껍게
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / Math.max(1, frames - 1);
    const rise = p < 0.3 ? smooth(0, 1, p / 0.3) : p < 0.75 ? 1 : 1 - smooth(0, 1, (p - 0.75) / 0.25);
    const c = new PixelCanvas(w, h);
    for (const [sx, sh, hw, lean] of spikes) {
      const H = sh * rise * (h - 2);
      for (let y = 0; y < h; y++) {
        const fromBase = h - 1 - y;
        if (fromBase > H) continue;
        const t = fromBase / Math.max(1, H);                 // 0 바닥 → 1 끝
        const cxp = w * sx + lean * fromBase;
        const half = w * hw * (1 - t) ** 0.9 + 0.3;
        for (let x = 0; x < w; x++) {
          const d = x + 0.5 - cxp;
          if (Math.abs(d) > half) continue;
          // v2: 흰 능선이 끝까지 그어져 유리 바늘처럼 보임 → 능선은 위 40%만 밝게, 흰빛은 끝 몇 픽셀만
          const ridge = Math.abs(d) < 0.7 && t > 0.6;
          const col = ridge ? (t > 0.88 ? BLOOD_FX[4] : BLOOD_FX[3]) : d < 0 ? (t > 0.7 ? BLOOD_FX[3] : BLOOD_FX[2]) : (t > 0.7 ? BLOOD_FX[2] : BLOOD_FX[1]);
          c.set(x, y, Math.abs(d) > half - 0.8 ? BLOOD_FX[0] : col);
        }
      }
    }
    // 바닥 튐
    if (rise > 0.3) for (let x = 2; x < w - 2; x++) if ((x * 7) % 5 < 2) c.set(x, h - 1, BLOOD_FX[1]);
    out.push(bleedRGB(c));
  }
  return out;
}

/** 섬광: 가운데 흰빛 + 8방향 광선, 빠르게 수축 */
export function flashBurst({ size = 32, frames = 3 } = {}) {
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / Math.max(1, frames - 1), L = size * (0.5 - 0.25 * p);
    out.push(fieldToCanvas(size, (x, y) => {
      const dx = x - size / 2, dy = y - size / 2, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const ray = Math.abs(Math.cos(a * 4)) ** 12 * (1 - r / L);
      const core = 1 - r / (size * (0.18 - 0.08 * p));
      return Math.max(ray, core) * (1 - 0.3 * p) * 1.3;
    }, { ramp: BLOOD_FX, cut: 0.15 }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// v3 현대식 베기(4층): ① 피안개(바깥, 어둡고 넓게, 디더) ② 본체(진홍→주황 그라디언트) ③ 칼날선(안쪽 앞 가장자리 흰빛) ④ 불꽃 줄기(접선 방향으로 튐)
// 2010년대식 '단색 초승달 한 장'과의 차이: 층마다 색·두께·속도가 달라 부피와 속도감이 생긴다
// ---------------------------------------------------------------------------
const MIST = ['#14050e', '#2a0818', '#46102a'];
const BODY = ['#650f22', '#94182a', '#c42a2e', '#ec5a3c'];
const EDGE = ['#ff9a6a', '#ffd2b8', '#ffffff'];

export function slashV3({ size = 64, frames = 7, start = -150, sweep = 210, radius = 0.31, width = 0.18, seed = 1, sparks = 12 } = {}) {  // v3.1: 반지름을 줄여 잘림 방지
  const R = rng(seed);
  const sp = Array.from({ length: sparks }, () => ({ u: 0.45 + R() * 0.55, out: 0.4 + R() * 0.7, len: 3 + Math.floor(R() * 5), jit: (R() - 0.5) * 0.35 }));
  const cx = size / 2, cy = size / 2, Rr = size * radius, dir = Math.sign(sweep) || 1, sw = Math.abs(sweep);
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = frames === 1 ? 0.5 : k / (frames - 1);
    const headU = Math.min(1, 0.35 + p * 1.6);                 // 빠르게 펼침(앞 2~3프레임에 거의 완성)
    const tailU = Math.max(0, (p - 0.3) * 1.45);                // 꼬리부터 소멸
    const energy = 1 - smooth(0.55, 1, p);
    const c = new PixelCanvas(size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
        const a = (Math.atan2(dy, dx) * 180) / Math.PI;
        const u = ((((a - start) * dir) % 360) + 360) % 360 / sw;
        if (u > headU || u < tailU - 0.08) continue;
        const lu = (u - tailU) / Math.max(1e-3, headU - tailU);  // 0 꼬리 → 1 머리
        const w = size * width * (0.25 + 0.75 * Math.max(0, lu) ** 0.7);
        const off = r - Rr;                                     // + 바깥 / - 안쪽
        // ① 피안개: 바깥으로 넓게, 디더로 흐리게
        const mistW = w * 1.9;
        const inMist = off > -w * 0.2 && off < mistW && bayer(x, y) < (1 - off / mistW) * 0.75 * energy * (0.4 + lu);
        // ② 본체
        const inBody = off > -w * 0.35 && off < w * 0.7 && lu > 0;
        // ③ 칼날선: 안쪽 가장자리(off≈-0.3w) 1~2px, 머리 쪽만
        const edgeD = Math.abs(off + w * 0.28);
        const inEdge = lu > 0.35 && edgeD < (lu > 0.8 ? 1.3 : 0.8) && energy > 0.25;
        if (inEdge) c.set(x, y, EDGE[lu > 0.85 ? 2 : lu > 0.6 ? 1 : 0]);
        else if (inBody) { const t = (off + w * 0.35) / (w * 1.05); const lvl = Math.floor((1 - t) * 3 * (0.4 + 0.6 * lu) * (0.5 + 0.5 * energy) + 0.5 + (bayer(x, y) - 0.5) * 0.9); c.set(x, y, BODY[Math.max(0, Math.min(3, lvl))]); }  // 디더로 단계 경계를 섞어 줄무늬 방지
        else if (inMist) c.set(x, y, MIST[off < w ? 2 : off < w * 1.4 ? 1 : 0]);
      }
    // ④ 불꽃 줄기: 머리 근처에서 접선 방향으로 튀어나가 바깥으로 이동
    for (const s of sp) {
      if (s.u > headU || p < 0.08) continue;
      const ang = ((start + dir * sw * s.u) * Math.PI) / 180;
      const t = Math.min(1, (p - 0.08) * 1.6);
      const base = Rr + size * width * 0.3 + t * size * 0.14 * s.out;
      const tx = -Math.sin(ang) * dir, ty = Math.cos(ang) * dir;   // 진행 방향 접선
      const ox = Math.cos(ang + s.jit), oy = Math.sin(ang + s.jit);
      for (let i = 0; i < s.len; i++) {
        const px = Math.round(cx + ox * base + tx * i * 0.9), py = Math.round(cy + oy * base + ty * i * 0.9);
        if (px < 0 || py < 0 || px >= size || py >= size || p > 0.9) continue;
        c.set(px, py, i === 0 ? EDGE[2] : i < 2 ? EDGE[1] : BODY[3]);
      }
    }
    out.push(bleedRGB(c));
  }
  return out;
}

/** 타격 섬광: 흰 심 + 4방향 긴 광선 + 대각 짧은 광선 + 바깥 고리, 2~4프레임 */
export function impactStar({ size = 32, frames = 4 } = {}) {
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / Math.max(1, frames - 1);
    const c = new PixelCanvas(size), h = size / 2;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = Math.abs(x + 0.5 - h), dy = Math.abs(y + 0.5 - h), r = Math.hypot(dx, dy);
        const L = size * (0.5 - 0.15 * p), Ld = L * 0.55;
        const ray = (dx < 0.9 && dy < L * (1 - dx)) || (dy < 0.9 && dx < L * (1 - dy));
        const diag = Math.abs(dx - dy) < 0.8 && r < Ld;
        const ring = Math.abs(r - size * (0.18 + 0.25 * p)) < 0.9 && p > 0.2;
        const core = r < size * (0.14 - 0.08 * p);
        if (core) c.set(x, y, EDGE[2]);
        else if (ray) c.set(x, y, r < L * 0.4 ? EDGE[1] : EDGE[0]);
        else if (diag) c.set(x, y, BODY[3]);
        else if (ring && bayer(x, y) < 0.7 - p * 0.5) c.set(x, y, BODY[2]);
      }
    out.push(bleedRGB(c));
  }
  return out;
}

/** 바닥 균열: 중심에서 갈라지는 틈(빛나는 심 + 어두운 테)이 퍼져 나가고, 마지막엔 빛이 식는다 */
export function groundCrack({ size = 64, frames = 6, branches = 7, seed = 5 } = {}) {
  const R = rng(seed);
  const paths = Array.from({ length: branches }, (_, i) => {
    let a = (i / branches) * Math.PI * 2 + R() * 0.5, x = size / 2, y = size / 2;
    const pts = [[x, y]];
    for (let s = 0; s < 26; s++) { a += (R() - 0.5) * 0.45; x += Math.cos(a); y += Math.sin(a); pts.push([x, y]); }  // v3.1: 1px 간격 → 이어진 선
    return pts;
  });
  const out = [];
  for (let k = 0; k < frames; k++) {
    const p = k / Math.max(1, frames - 1), reach = Math.min(1, p * 2.2), cool = smooth(0.5, 1, p);
    const c = new PixelCanvas(size);
    for (const pts of paths) {
      const n = Math.floor(pts.length * reach);
      for (let i = 0; i < n; i++) {
        const [x, y] = pts[i].map(Math.round);
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!c.get(x + ox, y + oy)) c.set(x + ox, y + oy, MIST[1]);
        c.set(x, y, cool > 0.6 ? BODY[1] : cool > 0.2 ? BODY[3] : i < 3 ? EDGE[1] : EDGE[0]);
      }
    }
    out.push(bleedRGB(c));
  }
  return out;
}
